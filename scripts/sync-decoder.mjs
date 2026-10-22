import { copyFile, mkdir } from 'node:fs/promises';

const vendor = new URL('../extension/vendor/', import.meta.url);
await mkdir(vendor, { recursive: true });
for (const [source, target] of [['dist/jsQR.js', 'jsQR.js'], ['LICENSE', 'jsQR.LICENSE']]) {
  await copyFile(new URL('../node_modules/jsqr/' + source, import.meta.url), new URL(target, vendor));
}
console.log('Synced jsQR and its license into the standalone extension.');
