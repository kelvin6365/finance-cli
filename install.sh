#!/usr/bin/env bash
# finance-cli install script.
# Detects your platform, downloads the latest release binary from GitHub,
# and installs it to a directory on your PATH.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kelvin6365/finance-cli/main/install.sh | bash
#
# Override install dir:
#   curl -fsSL ... | INSTALL_DIR=$HOME/.local/bin bash

set -euo pipefail

REPO="kelvin6365/finance-cli"
BIN_NAME="finance"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }

die() { red "Error: $*" >&2; exit 1; }

detect_target() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Darwin)
      case "$arch" in
        arm64|aarch64) echo "finance-macos-arm64" ;;
        x86_64)        echo "finance-macos-x64" ;;
        *) die "Unsupported macOS architecture: $arch" ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64) echo "finance-linux-x64" ;;
        *) die "Unsupported Linux architecture: $arch (only x86_64 is published)" ;;
      esac
      ;;
    *)
      die "Unsupported OS: $os. For Windows, download finance-windows-x64.exe from the Releases page."
      ;;
  esac
}

main() {
  command -v curl >/dev/null 2>&1 || die "curl is required."

  local asset url tmp install_path sudo=""
  asset="$(detect_target)"
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  dim "Downloading ${asset} from ${url}"
  curl -fL --progress-bar -o "$tmp/${BIN_NAME}" "$url"
  chmod +x "$tmp/${BIN_NAME}"

  install_path="${INSTALL_DIR}/${BIN_NAME}"
  if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR" 2>/dev/null || sudo="sudo"
    [ -n "$sudo" ] && $sudo mkdir -p "$INSTALL_DIR"
  fi
  if [ -w "$INSTALL_DIR" ]; then
    mv "$tmp/${BIN_NAME}" "$install_path"
  else
    sudo="sudo"
    dim "Installing to ${install_path} (requires sudo)"
    $sudo mv "$tmp/${BIN_NAME}" "$install_path"
  fi

  green "✓ Installed: $install_path"

  case ":$PATH:" in
    *":${INSTALL_DIR}:"*) ;;
    *) dim "Note: ${INSTALL_DIR} is not on your PATH. Add it to your shell rc:"
       dim "  export PATH=\"${INSTALL_DIR}:\$PATH\"" ;;
  esac

  dim "Try it: ${BIN_NAME} --help"
}

main "$@"
