"""Mesh, preview and validation helpers adapted from xiaofan-ios/Artifacts/XiaofanMagnet/generate.py."""
from collections import Counter
import json
import os
import zipfile
import xml.etree.ElementTree as ET
os.environ.setdefault("MPLCONFIGDIR", "/private/tmp/space-fanfou-matplotlib")
os.environ.setdefault("XDG_CACHE_HOME", "/private/tmp/space-fanfou-cache")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from matplotlib.patches import PathPatch
from matplotlib.path import Path as PlotPath
import numpy as np
from shapely.geometry import Polygon
import trimesh
WIDTH, BASE, RELIEF = 50.0, 3.0, 1.0
BLUE = "#2F85FF"


def extrude(polygon, thickness, z=0):
    mesh = trimesh.creation.extrude_polygon(polygon, thickness, engine="earcut")
    mesh.apply_translation([0, 0, z])
    assert mesh.is_watertight and mesh.is_volume
    return mesh


def patch(polygon, **kwargs):
    points, codes = [], []
    for ring in [polygon.exterior, *polygon.interiors]:
        coords = list(ring.coords)
        points.extend(coords)
        codes.extend([PlotPath.MOVETO] + [PlotPath.LINETO] * (len(coords)-2) + [PlotPath.CLOSEPOLY])
    return PathPatch(PlotPath(points, codes), **kwargs)


def preview(plate, logo, destination, shape, *, brand="XIAOFAN", base_color="#FFFFFF",
            icon_color=BLUE, subtitle="A little conversation, on your fridge.",
            relief_label="Raised blue icon", footprint=None):
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11,
                         "text.color": "#263447", "axes.labelcolor": "#263447"})
    fig = plt.figure(figsize=(14, 9), facecolor="#F3F5F7")
    fig.text(0.055, 0.925, brand, fontsize=12, weight="bold", color=icon_color if icon_color != "#FFFFFF" else base_color)
    fig.text(0.055, 0.872, subtitle, fontsize=23, weight="bold")
    fig.text(0.055, 0.83, "50 mm fridge magnet  /  actual model geometry", fontsize=11, color="#637083")
    ax = fig.add_axes([0.035, 0.27, 0.595, 0.52], facecolor="#F3F5F7")
    azimuth, elevation = np.radians([-65, 48])
    camera = np.array([np.cos(elevation)*np.cos(azimuth),
                       np.cos(elevation)*np.sin(azimuth), np.sin(elevation)])
    horizontal = np.array([-np.sin(azimuth), np.cos(azimuth), 0])
    vertical = np.cross(camera, horizontal)
    projection = np.column_stack((horizontal, vertical))
    def project(points, z):
        xy = np.asarray(points)
        xyz = np.column_stack((xy - 25, np.full(len(xy), z)))
        return xyz @ projection
    light = np.array([-0.4, -0.6, 1.0])
    light /= np.linalg.norm(light)
    # Render the planar faces and extruded contour walls directly. Drawing full
    # planar polygons avoids triangle-sort artifacts in Matplotlib's 3D painter.
    logo_polygons = list(logo.geoms) if logo.geom_type == "MultiPolygon" else [logo]
    for polygon, color, bottom, top_z in [(plate, base_color, 0, BASE),
            *((part, icon_color, BASE, BASE+RELIEF) for part in logo_polygons)]:
        walls = []
        rgb = np.array(to_rgb(color))
        for ring in [polygon.exterior, *polygon.interiors]:
            points = np.asarray(ring.coords)
            for a, b in zip(points[:-1], points[1:]):
                delta = b-a
                normal = np.array([delta[1], -delta[0], 0])
                normal /= np.linalg.norm(normal)
                if normal @ camera <= 0:
                    continue
                quad = np.vstack((project([a, b], bottom), project([b, a], top_z)))
                shade = 0.65 + 0.35 * max(0, normal @ light)
                depth = np.dot(np.array([*((a+b)/2-25), (bottom+top_z)/2]), camera)
                walls.append((depth, quad, shade*rgb))
        for _, quad, color_rgb in sorted(walls, key=lambda wall: wall[0]):
            ax.fill(quad[:, 0], quad[:, 1], color=color_rgb, linewidth=0, antialiased=True)
        projected = Polygon(project(polygon.exterior.coords, top_z),
                            [project(ring.coords, top_z) for ring in polygon.interiors])
        ax.add_patch(patch(projected, facecolor=rgb, edgecolor="none"))
    ax.set(xlim=(-37, 37), ylim=(-29, 29), aspect="equal")
    ax.axis("off")
    fig.text(0.08, 0.245, f"01  /  {relief_label}", color="#637083")

    top = fig.add_axes([0.665, 0.375, 0.255, 0.385], facecolor="#F3F5F7")
    top.add_patch(patch(plate, facecolor=base_color, edgecolor="#D6DEE7", linewidth=1))
    for part in logo_polygons:
        top.add_patch(patch(part, facecolor=icon_color, edgecolor="none"))
    top.annotate("", xy=(0, -4), xytext=(50, -4),
                 arrowprops={"arrowstyle": "|-|", "color": "#8A96A5", "linewidth": 0.8})
    top.text(25, -7.8, "50 mm", ha="center", color="#637083", fontsize=10)
    top.set(xlim=(-4, 54), ylim=(-10, 54), aspect="equal")
    top.axis("off")
    fig.text(0.695, 0.345, "02  /  Front view", color="#637083")

    fig.add_artist(plt.Line2D([0.055, 0.945], [0.2, 0.2], color="#DAE0E6", linewidth=1))
    if footprint is None:
        footprint = ("Ø50 mm", "Circle · R25 mm") if shape == "circle" else ("50 × 50 mm", "Rounded square · R11 mm")
    for x, value, label in ((0.055, *footprint),
                             (0.36, f"{BASE:.1f} + {RELIEF:.1f} mm", "Base + raised icon"),
                             (0.665, f"{BASE+RELIEF:.1f} mm", "Total printed thickness")):
        fig.text(x, 0.143, value, fontsize=19, weight="bold")
        fig.text(x, 0.108, label, fontsize=10, color="#637083")
    fig.text(0.055, 0.048, "Flat back for adhesive magnetic sheet · No magnet recess · Magnet sheet not included in thickness",
             fontsize=10, color="#637083")
    fig.savefig(destination / "preview.png", dpi=180, facecolor=fig.get_facecolor())
    plt.close(fig)


def validate_export(base, relief, solid, destination, stem, *, colors=("#FFFFFF", BLUE),
                    expected_dimensions=None):
    stl = trimesh.load_mesh(destination / f"{stem}.stl")
    assert stl.is_watertight and stl.is_volume and stl.body_count == 1
    np.testing.assert_allclose(stl.extents,
        expected_dimensions if expected_dimensions is not None else [WIDTH, WIDTH, BASE + RELIEF], atol=1e-5)
    np.testing.assert_allclose(solid.volume, base.volume + relief.volume, rtol=1e-6)
    # Every triangle edge has exactly two incident faces.
    counts = Counter(map(tuple, np.sort(stl.edges, axis=1)))
    assert set(counts.values()) == {2}
    with zipfile.ZipFile(destination / f"{stem}.3mf") as archive:
        assert archive.testzip() is None
        doc = ET.fromstring(archive.read("3D/3dmodel.model"))
        config = json.loads(archive.read("Metadata/project_settings.config"))
        settings = ET.fromstring(archive.read("Metadata/model_settings.config"))
        assert [c.upper() for c in config["filament_colour"]] == list(colors)
        assert config["printer_settings_id"] == "Bambu Lab A1 mini 0.4 nozzle"
        assert config["layer_height"] == "0.2"
        assert [p.find("metadata[@key='extruder']").attrib["value"]
                for p in settings.findall("object/part")] == ["1", "2"]
    ns = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"}
    reloaded = []
    for geometry in doc.findall("m:resources/m:object/m:mesh", ns):
        vertices = [[float(v.attrib[c]) for c in ("x", "y", "z")]
                    for v in geometry.findall("m:vertices/m:vertex", ns)]
        faces = [[int(t.attrib[c]) for c in ("v1", "v2", "v3")]
                 for t in geometry.findall("m:triangles/m:triangle", ns)]
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        assert mesh.is_volume and mesh.is_watertight
        reloaded.append(mesh)
    assert len(reloaded) == 2
    np.testing.assert_allclose(reloaded[0].bounds[1, 2], reloaded[1].bounds[0, 2], atol=1e-7)
    for exported, source in zip(reloaded, (base, relief)):
        np.testing.assert_allclose(exported.extents, source.extents, atol=1e-5)
        np.testing.assert_allclose(exported.volume, source.volume, rtol=1e-6)
    return {"stl_watertight": True, "stl_consistent_winding": bool(stl.is_winding_consistent),
            "stl_connected_bodies": stl.body_count, "stl_nonmanifold_edges": 0,
            "dimensions_mm": stl.extents.tolist(), "volume_mm3": float(stl.volume),
            "stl_triangles": len(stl.faces), "3mf_closed_material_parts": 2,
            "3mf_exporter": "three-3mf-exporter 45.2.0",
            "3mf_printer_profile": config["printer_settings_id"],
            "3mf_filament_colors": config["filament_colour"],
            "3mf_layer_height_mm": float(config["layer_height"]),
            "estimated_pla_mass_g_at_1.24_g_cm3": float(stl.volume * 0.00124)}
