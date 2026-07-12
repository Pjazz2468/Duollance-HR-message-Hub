#!/bin/bash
curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=10.26.1 sh -
export PATH="$HOME/.local/share/pnpm:$PATH"
pnpm install --no-frozen-lockfile
cd artifacts/hr-templates
pnpm run build
