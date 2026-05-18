import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const nextPackagePath = path.join(workspaceRoot, 'node_modules', 'next', 'package.json');
const rootPostcssPath = path.join(workspaceRoot, 'node_modules', 'postcss', 'package.json');
const nestedPostcssPath = path.join(workspaceRoot, 'node_modules', 'next', 'node_modules', 'postcss');

if (!existsSync(nextPackagePath) || !existsSync(rootPostcssPath) || !existsSync(nestedPostcssPath)) {
  process.exit(0);
}

const nextPackage = JSON.parse(readFileSync(nextPackagePath, 'utf8'));
const rootPostcssPackage = JSON.parse(readFileSync(rootPostcssPath, 'utf8'));

if (nextPackage.dependencies?.postcss !== '^8.5.14') {
  process.exit(0);
}

const [major, minor, patch] = String(rootPostcssPackage.version)
  .split('.')
  .map((value) => Number.parseInt(value, 10));

const isSecurePostcss =
  major > 8 || (major === 8 && (minor > 5 || (minor === 5 && patch >= 10)));

if (!isSecurePostcss) {
  throw new Error(`Expected a secure root postcss version, found ${rootPostcssPackage.version}.`);
}

rmSync(nestedPostcssPath, { force: true, recursive: true });