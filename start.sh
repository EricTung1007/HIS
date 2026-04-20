#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 長照HIS 啟動程式 ==="
echo ""

# ── 1. Install Homebrew if missing ──────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "▶ 安裝 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon Macs
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

# ── 2. Install Node.js if missing ───────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "▶ 安裝 Node.js..."
  brew install node
fi

echo "✓ Node.js $(node -v)"
echo ""

# ── 3. Install dependencies ─────────────────────────────────────────────────
echo "▶ 安裝後端依賴..."
cd "$SCRIPT_DIR/backend" && npm install --silent

echo "▶ 安裝前端依賴..."
cd "$SCRIPT_DIR/frontend" && npm install --silent

echo ""

# ── 4. Free ports if already in use ─────────────────────────────────────────
for PORT in 3000 3001; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "▶ 釋放 port $PORT (PID $PID)..."
    kill -9 $PID 2>/dev/null || true
  fi
done

# ── 5. Start backend ─────────────────────────────────────────────────────────
echo "▶ 啟動後端 (port 3001)..."
cd "$SCRIPT_DIR/backend"
node src/server.js > /tmp/his-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
for i in {1..10}; do
  if curl -s http://localhost:3001/api/health &>/dev/null; then
    break
  fi
  sleep 0.5
done

# ── 6. Start frontend ────────────────────────────────────────────────────────
echo "▶ 啟動前端 (port 3000)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/his-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

# ── 7. Print access info ─────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "無法取得")

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ 長照HIS 已啟動                        ║"
echo "╠══════════════════════════════════════════╣"
echo "║  本機:  http://localhost:3000             ║"
echo "║  手機:  http://${LOCAL_IP}:3000         ║"
echo "╠══════════════════════════════════════════╣"
echo "║  帳號: nurse1  密碼: nurse123             ║"
echo "║  帳號: admin   密碼: admin123             ║"
echo "╠══════════════════════════════════════════╣"
echo "║  按 Ctrl+C 停止所有服務                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 8. Ctrl+C stops everything ───────────────────────────────────────────────
trap "echo ''; echo '▶ 正在停止所有服務...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✓ 已停止'; exit 0" INT TERM

# Keep script alive
wait $FRONTEND_PID
