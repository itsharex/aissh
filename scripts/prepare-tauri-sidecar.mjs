import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const profileArg = process.argv[2] ?? 'debug';
const profile = profileArg === 'release' ? 'release' : 'debug';

const platform = process.platform;
const arch = process.arch;

// Determine targets based on platform
const targets = [];
if (platform === 'darwin') {
  // For macOS, we build both architectures to support Universal binaries
  targets.push('x86_64-apple-darwin');
  targets.push('aarch64-apple-darwin');
} else if (platform === 'win32') {
  targets.push('x86_64-pc-windows-msvc');
} else if (platform === 'linux') {
  targets.push('x86_64-unknown-linux-gnu');
} else {
  throw new Error(`Unsupported platform: ${platform}`);
}

const exeExt = platform === 'win32' ? '.exe' : '';

const findFirstExisting = (candidates) => {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const ensureTauriIcons = () => {
  const iconsDir = path.join(projectRoot, 'src-tauri', 'icons');
  if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
  }

  const pngSource = findFirstExisting([
    path.join(
      projectRoot,
      'node_modules',
      '.pnpm',
      'electron-builder@26.0.12_electron-builder-squirrel-windows@26.0.12',
      'node_modules',
      'app-builder-lib',
      'templates',
      'icons',
      'electron-linux',
      '256x256.png'
    ),
    path.join(projectRoot, 'node_modules', 'electron-builder', 'templates', 'icons', 'electron-linux', '256x256.png'),
  ]);

  const icnsSource = findFirstExisting([
    path.join(projectRoot, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Resources', 'electron.icns'),
  ]);

  const icoSource = findFirstExisting([
    path.join(
      projectRoot,
      'node_modules',
      '.pnpm',
      'electron-builder@26.0.12_electron-builder-squirrel-windows@26.0.12',
      'node_modules',
      'app-builder-lib',
      'templates',
      'icons',
      'proton-native',
      'proton-native.ico'
    ),
    path.join(projectRoot, 'node_modules', 'electron-builder', 'templates', 'icons', 'proton-native', 'proton-native.ico'),
  ]);

  const targets = [
    { src: pngSource, dst: path.join(iconsDir, 'icon.png') },
    { src: icnsSource, dst: path.join(iconsDir, 'icon.icns') },
    { src: icoSource, dst: path.join(iconsDir, 'icon.ico') },
  ];

  for (const t of targets) {
    if (!t.src) continue;
    // Only copy if destination doesn't exist to avoid overwriting user icons if they added them manually
    // But for now, let's overwrite to ensure it works as expected by previous logic
    fs.copyFileSync(t.src, t.dst);
  }
};

const backRustDir = path.join(projectRoot, 'back-rust');
const manifestPath = path.join(backRustDir, 'Cargo.toml');

ensureTauriIcons();

const binariesDir = path.join(projectRoot, 'src-tauri', 'binaries');
fs.mkdirSync(binariesDir, { recursive: true });

for (const target of targets) {
  console.log(`Building for target: ${target}`);
  
  // Ensure target is added (best effort)
  try {
      spawnSync('rustup', ['target', 'add', target], { stdio: 'inherit' });
  } catch (e) {
      console.warn(`Failed to add target ${target}, assuming it exists or rustup is missing.`);
  }

  const cargoArgs = ['build', '--manifest-path', manifestPath, '--target', target];
  if (profile === 'release') cargoArgs.push('--release');

  const buildResult = spawnSync('cargo', cargoArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (buildResult.status !== 0) {
    console.error(`Failed to build for ${target}`);
    process.exit(buildResult.status ?? 1);
  }

  // When using --target, artifacts are in target/<target_triple>/<profile>
  const builtBinaryPath = path.join(backRustDir, 'target', target, profile, `back-rust${exeExt}`);
  
  if (!fs.existsSync(builtBinaryPath)) {
    throw new Error(`Built binary not found: ${builtBinaryPath}`);
  }

  const sidecarPath = path.join(binariesDir, `back-rust-${target}${exeExt}`);
  fs.copyFileSync(builtBinaryPath, sidecarPath);

  if (platform !== 'win32') {
    fs.chmodSync(sidecarPath, 0o755);
  }

  console.log(`Prepared sidecar: ${path.relative(projectRoot, sidecarPath)}`);
}
