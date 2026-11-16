#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Scholaris Local Development Setup"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

# 1. Environment check
if [ ! -f .env ]; then
  echo "[-] .env not found. Creating from .env.example..."
  cp .env.example .env
  echo "[+] Created .env file."
else
  echo "[+] .env file present."
fi

# 2. Check Docker
if command -v docker >/dev/null 2>&1; then
  echo "[+] Docker found: $(docker --version)"
  
  if docker compose version >/dev/null 2>&1; then
    echo "[+] Docker Compose found: $(docker compose version)"
    echo "[*] Starting local PostgreSQL, Redis, and MinIO services..."
    docker compose up -d
    echo "[+] Local services started."
    echo "[*] Waiting for services to become healthy..."
    sleep 3
    docker compose ps
  else
    echo "[!] Docker Compose plugin not found. Please install docker-compose-v2."
  fi
else
  echo "[!] Docker is not installed or not in PATH."
  echo "    To install on Ubuntu, run:"
  echo "    sudo apt update && sudo apt install -y docker.io docker-compose-v2"
  echo "    sudo usermod -aG docker \$USER"
  echo "    sudo systemctl enable --now docker"
fi

echo "=========================================="
echo " Setup check complete."
echo "=========================================="
