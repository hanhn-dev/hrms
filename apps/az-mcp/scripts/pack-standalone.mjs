import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const appRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const standaloneDir = join(appRoot, 'standalone');
const manifest = JSON.parse(readFileSync(join(standaloneDir, 'package.json'), 'utf8'));
const zipName = `${manifest.name}-${manifest.version}.zip`;
const zipPath = join(standaloneDir, zipName);
const folderName = manifest.name;

const now = new Date();
const dosTime =
  (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

const files = [
  'package.json',
  'README.md',
  '.env.example',
  'dist/index.js',
];

const entries = files.map((relativePath) => {
  const sourcePath = join(standaloneDir, relativePath);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing handoff file: ${relativePath}`);
  }

  const uncompressed = readFileSync(sourcePath);
  const compressed = deflateRawSync(uncompressed);

  return {
    name: `${folderName}/${relativePath.replaceAll('\\', '/')}`,
    uncompressed,
    compressed,
    crc: crc32(uncompressed),
  };
});

const localParts = [];
const centralParts = [];
let offset = 0;

for (const entry of entries) {
  const name = Buffer.from(entry.name, 'utf8');
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(entry.crc >>> 0, 14);
  localHeader.writeUInt32LE(entry.compressed.length, 18);
  localHeader.writeUInt32LE(entry.uncompressed.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);

  localParts.push(localHeader, name, entry.compressed);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(8, 10);
  centralHeader.writeUInt16LE(dosTime, 12);
  centralHeader.writeUInt16LE(dosDate, 14);
  centralHeader.writeUInt32LE(entry.crc >>> 0, 16);
  centralHeader.writeUInt32LE(entry.compressed.length, 20);
  centralHeader.writeUInt32LE(entry.uncompressed.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(offset, 42);

  centralParts.push(centralHeader, name);
  offset += localHeader.length + name.length + entry.compressed.length;
}

const centralDirectory = Buffer.concat(centralParts);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(entries.length, 8);
eocd.writeUInt16LE(entries.length, 10);
eocd.writeUInt32LE(centralDirectory.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

writeFileSync(zipPath, Buffer.concat([...localParts, centralDirectory, eocd]));

const leftoverTarball = join(standaloneDir, `${manifest.name}-${manifest.version}.tgz`);
if (existsSync(leftoverTarball)) {
  unlinkSync(leftoverTarball);
}

process.stdout.write(`Wrote ${zipPath}\n`);
