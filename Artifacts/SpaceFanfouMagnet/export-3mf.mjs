// Same Bambu project exporter and printer profile as XiaofanMagnet.
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const [directory, stem, baseColor, logoColor] = process.argv.slice(2);
if (!directory || !stem || !baseColor || !logoColor) {
  throw new Error('Expected directory, stem, base color and logo color');
}
const require = createRequire(process.env.SPACE_FANFOU_3MF_DEPENDENCIES
  ?? new URL('./package.json', import.meta.url));
const THREE = await import(require.resolve('three'));
const {STLLoader} = await import(require.resolve('three/addons/loaders/STLLoader.js'));
const {defaultPrintConfig, exportTo3MF} = await import(require.resolve('three-3mf-exporter'));
const loader = new STLLoader();
const group = new THREE.Group();
group.name = 'Space Fanfou fridge magnet';
for (const [filename, name, color] of [
  ['part-base.stl', 'Blue icon silhouette base', baseColor],
  ['part-logo.stl', 'White 饭 relief', logoColor],
]) {
  const data = await readFile(resolve(directory, filename));
  const geometry = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color}));
  mesh.name = name;
  group.add(mesh);
}
const blob = await exportTo3MF(group, {
  printer_name: 'Bambu Lab A1 mini',
  filament: 'Bambu PLA Basic @BBL A1M',
  printableWidth: 180,
  printableDepth: 180,
  printableHeight: 180,
  printableArea: ['0x0', '180x0', '180x180', '0x180'],
  printerSettingsId: 'Bambu Lab A1 mini 0.4 nozzle',
  printSettingsId: '0.20mm Standard @BBL A1M',
  metadata: {...defaultPrintConfig.metadata, ApplicationTitle: 'Space Fanfou fridge magnet'},
});
await writeFile(resolve(directory, `${stem}.3mf`), new Uint8Array(await blob.arrayBuffer()));
