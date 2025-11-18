#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const USAGE = `
Usage:
  pnpm bump-version --package <name> --type <major|minor|patch>
  pnpm bump-version --package <name> --version <x.y.z>

Options:
  --package, -p   Package name from package.json (e.g. @prism-lang/core)
  --type, -t      Semver bump type (major, minor, patch)
  --version, -v   Explicit version to set
  --dry-run       Print changes without writing files
`;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--package':
      case '-p':
        args.package = argv[++i];
        break;
      case '--type':
      case '-t':
        args.type = argv[++i];
        break;
      case '--version':
      case '-v':
        args.version = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--notes':
      case '-n':
        args.notes = argv[++i];
        break;
      case '--help':
      case '-h':
        console.log(USAGE.trim());
        process.exit(0);
      default:
        console.warn(`Unknown argument: ${arg}`);
        console.log(USAGE.trim());
        process.exit(1);
    }
  }
  return args;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver: ${current}`);
  }
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }
}

function loadPackageJson(pkgPath) {
  const raw = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(raw);
}

function writePackageJson(pkgPath, data, dryRun) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  if (dryRun) {
    console.log(`[dry-run] ${pkgPath}`);
    return;
  }
  fs.writeFileSync(pkgPath, content, 'utf8');
}

function collectWorkspacePackages() {
  const locations = ['packages', 'apps'];
  const entries = [];

  for (const location of locations) {
    const base = path.join(repoRoot, location);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      const pkgJson = path.join(base, entry, 'package.json');
      if (fs.existsSync(pkgJson)) {
        entries.push({ name: null, dir: path.dirname(pkgJson), pkgPath: pkgJson });
      }
    }
  }

  // include root package
  const rootPkg = path.join(repoRoot, 'package.json');
  if (fs.existsSync(rootPkg)) {
    entries.push({ name: null, dir: repoRoot, pkgPath: rootPkg });
  }

  return entries.map((entry) => {
    const data = loadPackageJson(entry.pkgPath);
    return { ...entry, data, name: data.name };
  });
}

function updateDependencyVersions(pkg, depName, newVersion) {
  let changed = false;
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  for (const section of sections) {
    if (pkg.data[section] && pkg.data[section][depName]) {
      pkg.data[section][depName] = newVersion;
      changed = true;
    }
  }
  return changed;
}

function updateChangelog(pkgDir, version, type, notes, dryRun) {
  const changelogPath = path.join(pkgDir, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    return;
  }

  const headingMap = {
    major: 'Major Changes',
    minor: 'Minor Changes',
    patch: 'Patch Changes',
  };
  const heading = headingMap[type] || 'Changes';
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    `## ${version} - ${date}`,
    '',
    `### ${heading}`,
    '',
    `- ${notes || `Bump version to ${version}.`}`,
    '',
  ].join('\n');

  const existing = fs.readFileSync(changelogPath, 'utf8');
  const lines = existing.split(/\r?\n/);
  let insertIndex = 1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      insertIndex = i;
      break;
    }
  }

  lines.splice(insertIndex, 0, entry);
  const updated = lines.join('\n');

  if (dryRun) {
    console.log(`[dry-run] Updating ${changelogPath} with:\n${entry}`);
    return;
  }
  fs.writeFileSync(changelogPath, updated, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.package) {
    console.error('Missing --package');
    console.log(USAGE.trim());
    process.exit(1);
  }
  if (!args.type && !args.version) {
    console.error('Specify either --type or --version');
    console.log(USAGE.trim());
    process.exit(1);
  }

  const packages = collectWorkspacePackages();
  const target = packages.find((pkg) => pkg.name === args.package);
  if (!target) {
    console.error(`Package ${args.package} not found.`);
    process.exit(1);
  }

  const currentVersion = target.data.version;
  const nextVersion = args.version || bumpVersion(currentVersion, args.type);

  if (currentVersion === nextVersion) {
    console.log(`${args.package} is already at ${nextVersion}`);
    return;
  }

  target.data.version = nextVersion;
  writePackageJson(target.pkgPath, target.data, args.dryRun);
  console.log(`${args.dryRun ? '[dry-run] ' : ''}${args.package}: ${currentVersion} → ${nextVersion}`);
  updateChangelog(target.dir, nextVersion, args.type, args.notes, args.dryRun);

  for (const pkg of packages) {
    if (pkg.name === args.package) continue;
    if (updateDependencyVersions(pkg, args.package, nextVersion)) {
      writePackageJson(pkg.pkgPath, pkg.data, args.dryRun);
      console.log(`${args.dryRun ? '[dry-run] ' : ''}Updated dependency in ${pkg.pkgPath}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
