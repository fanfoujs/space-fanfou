"""Trace the committed Space Fanfou PNG and build a two-color 50 mm magnet."""
from pathlib import Path
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from shapely import contains_xy, set_precision
from shapely.affinity import affine_transform
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.polygon import orient
from skimage.measure import find_contours
import trimesh
import mesh_utils as shared

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
SOURCE = ROOT / "public/icons/icon-640.png"
STEM = "space-fanfou-magnet-50mm"
SIZE, BASE, RELIEF = 50.0, 3.0, 1.0
BLUE, WHITE = "#2F85FF", "#FFFFFF"


def trace(coverage):
    # Padding closes contours which meet an image edge, preserving clipped strokes.
    rings = [Polygon(np.column_stack((
        (c[:, 1] - 0.5) * SIZE / coverage.shape[1],
        SIZE - (c[:, 0] - 0.5) * SIZE / coverage.shape[0],
    ))) for c in find_contours(np.pad(coverage, 1), 0.5)]
    result = Polygon()
    for ring in rings:
        result = result.symmetric_difference(ring)
    assert result.is_valid
    return result


def parts(shape):
    return list(shape.geoms) if shape.geom_type == "MultiPolygon" else [shape]


def svg_path(shape):
    commands = []
    for polygon in parts(shape):
        for ring in [polygon.exterior, *polygon.interiors]:
            coords = list(ring.coords)[:-1]
            commands.append("M " + " L ".join(f"{x:.6f},{y:.6f}" for x, y in coords) + " Z")
    return " ".join(commands)


def main():
    image = np.asarray(Image.open(SOURCE).convert("RGBA"), dtype=float)
    alpha = image[:, :, 3] / 255
    # Blue has a vertical gradient. Estimate its red channel per row; white's
    # coverage is then independent of that gradient. Alpha clips the outer edge.
    red = image[:, :, 0]
    background = np.array([np.min(row[a > 0.99]) for row, a in zip(red, alpha)])
    white = np.clip((red - background[:, None]) / (255 - background[:, None]), 0, 1) * alpha
    raw_plate, raw_logo = trace(alpha), trace(white)
    # A 1 micron grid avoids nearly coincident vertices collapsing in STL's
    # float32 coordinates, particularly where the character meets the perimeter.
    plate = orient(set_precision(set_precision(raw_plate.simplify(0.008, preserve_topology=True), 0.001), 0), sign=1)
    # The original white strokes run to the perimeter; they must stay supported.
    # A 0.01 mm inset at the outer edge avoids coincident vertical side walls.
    # It is far below nozzle width and keeps all relief supported by the base.
    logo = raw_logo.simplify(0.008, preserve_topology=True).intersection(plate.buffer(-0.01))
    logo = MultiPolygon([orient(p, sign=1) for p in parts(logo)])
    assert plate.is_valid and logo.is_valid
    assert plate.covers(logo)
    assert plate.geom_type == "Polygon" and len(plate.interiors) == 0
    rows, cols = np.indices(alpha.shape)
    x, y = (cols + 0.5) * SIZE / alpha.shape[1], SIZE - (rows + 0.5) * SIZE / alpha.shape[0]
    metrics = {}
    for name, shape, source in (("silhouette", plate, alpha), ("white_character", logo, white)):
        actual, expected = contains_xy(shape, x, y), source >= 0.5
        iou = np.count_nonzero(actual & expected) / np.count_nonzero(actual | expected)
        assert iou > 0.998, (name, iou)
        metrics[name + "_source_mask_iou"] = float(iou)

    ns = "http://www.w3.org/2000/svg"
    ET.register_namespace("", ns)
    svg = ET.Element(f"{{{ns}}}svg", {"viewBox": "0 0 50 50", "width": "50mm", "height": "50mm"})
    ET.SubElement(svg, f"{{{ns}}}title").text = "Space Fanfou — traced from icon-640.png; blue gradient flattened"
    for name, shape, color in (("blue-base", plate, BLUE), ("white-character", logo, WHITE)):
        ET.SubElement(svg, f"{{{ns}}}path", {"id": name, "fill": color, "fill-rule": "evenodd",
            "d": svg_path(affine_transform(shape, [1, 0, 0, -1, 0, SIZE]))})
    ET.ElementTree(svg).write(OUT / "space-fanfou.svg", encoding="utf-8", xml_declaration=True)
    base = shared.extrude(plate, BASE)
    relief = trimesh.util.concatenate([shared.extrude(p, RELIEF, BASE) for p in parts(logo)])
    solid = trimesh.boolean.union([base, relief], engine="manifold")
    solid.export(OUT / f"{STEM}.stl")
    base.export(OUT / "part-base.stl")
    relief.export(OUT / "part-logo.stl")
    subprocess.run(["node", str(OUT / "export-3mf.mjs"), str(OUT), STEM, BLUE, WHITE], check=True)
    metrics.update(shared.validate_export(base, relief, solid, OUT, STEM, colors=(BLUE, WHITE)))
    scene = trimesh.load_scene(OUT / f"{STEM}.3mf")
    assert len(scene.geometry) == 2 and all(m.is_volume for m in scene.geometry.values())
    np.testing.assert_allclose(scene.extents, [SIZE, SIZE, BASE + RELIEF], atol=1e-5)
    metrics.update({"source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "base_color": BLUE, "relief_color": WHITE, "base_thickness_mm": BASE,
        "relief_height_mm": RELIEF, "white_stroke_components": len(parts(logo)),
        "gradient": "Flattened to single blue for two-color printing",
        "back": "Flat for adhesive magnetic sheet; no recess",
        "application_loading_verified": False, "physical_print_verified": False})
    (OUT / "validation.json").write_text(json.dumps(metrics, indent=2) + "\n")
    shared.preview(plate, logo, OUT, "source-silhouette", brand="SPACE FANFOU", base_color=BLUE,
        icon_color=WHITE, subtitle="Space Fanfou, ready for your fridge.", relief_label="Raised white character",
        footprint=("50 × 50 mm", "Original icon silhouette"))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
