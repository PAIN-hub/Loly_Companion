import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

function fixAppImage() {
  if (!fs.existsSync(distDir)) return;
  const files = fs.readdirSync(distDir);
  const appImageFile = files.find(f => f.endsWith('.AppImage') && !f.includes('-core'));

  if (!appImageFile) {
    console.log('[fix-appimage] No raw .AppImage found to wrap.');
    return;
  }

  const origPath = path.join(distDir, appImageFile);
  const corePath = path.join(distDir, appImageFile.replace('.AppImage', '-core.AppImage'));

  if (!fs.existsSync(corePath)) {
    fs.renameSync(origPath, corePath);
  }

  const launcherContent = `#!/usr/bin/env bash
# Universal AppImage launcher for Loly (works on all Linux distros with or without libfuse2)
set -e
HERE="$(dirname "$(readlink -f "$0")")"
CORE="$HERE/${path.basename(corePath)}"

if [ ! -f "$CORE" ]; then
  echo "[Loly Error] Core AppImage binary not found at: $CORE" >&2
  exit 1
fi

# Detect whether libfuse2 is available in dynamic linker cache
if ldconfig -p 2>/dev/null | grep -q 'libfuse\\.so\\.2'; then
  exec "$CORE" "$@"
else
  # Seamlessly execute with extract-and-run on modern Ubuntu 22.04+, 24.04+, Debian 12+, Kali
  exec "$CORE" --appimage-extract-and-run "$@"
fi
`;

  fs.writeFileSync(origPath, launcherContent, { mode: 0o755 });
  const genericAppImage = path.join(distDir, 'Loly.AppImage');
  fs.writeFileSync(genericAppImage, launcherContent, { mode: 0o755 });

  console.log(`[fix-appimage] Successfully created universal runner for ${appImageFile} and Loly.AppImage`);
}

fixAppImage();
