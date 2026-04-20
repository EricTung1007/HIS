# 台灣長照資訊系統 (LTC-HIS)

台灣長期照護場景之醫療資訊系統，提供完整的住民照護記錄管理，並內建 AI 語音護理助理。

## 功能模組

| 模組 | 功能 |
|------|------|
| 住民管理 | 基本資料、入退住管理、警告事項 |
| 病史記錄 | 主訴、現病史、過去病史、家族史、手術史、過敏記錄、診斷管理 |
| 用藥醫囑 | 開立醫囑、停藥管理、多種給藥途徑/頻率 |
| 用藥記錄 (MAR) | 每日給藥記錄、給藥狀態追蹤（已給/暫停/拒絕/無藥）|
| 出入量記錄 | 每日液體攝入/排出量記錄、體液平衡計算 |
| 生命徵象 | 血壓/心率/呼吸/體溫/血氧/體重/血糖/疼痛指數 |
| 身體評估 (PE Sheet) | 全身系統評估、跌倒風險(Morse Fall Scale)、壓傷風險(Braden Scale) |
| 護理記錄 | SOAP格式、DAR格式、敘述型護理記錄 |
| AI 語音助理 | 自然語言輸入照護動作，自動寫入對應記錄 |

## 技術架構

- **後端**: Node.js + Express + SQLite (better-sqlite3)
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **認證**: JWT Bearer Token
- **AI**: OpenAI GPT-4o（或任何 OpenAI 相容 API）
- **語音**: 瀏覽器 Web Speech API（zh-TW）

---

## 快速開始

### macOS（推薦）

**一行啟動**，自動安裝 Node.js、安裝依賴、啟動前後端：

```bash
git clone <repo-url>
cd HIS
./start.sh
```

- 若尚未安裝 Homebrew / Node.js，腳本會自動安裝
- 啟動後顯示本機與手機存取網址
- **按一次 `Ctrl+C`** 停止所有服務

### Windows

**1. 安裝 Node.js**（若尚未安裝）
前往 https://nodejs.org 下載 LTS 版本並安裝。

**2. 下載專案**
```powershell
git clone <repo-url>
cd HIS
```

**3. 安裝依賴**
```powershell
cd backend
npm install
cd ..\frontend
npm install
```

**4. 建立測試資料**（第一次執行）
```powershell
cd ..\backend
node src/seed.js
```

**5. 啟動後端**（Terminal 1）
```powershell
cd backend
node src/server.js
```

**6. 啟動前端**（Terminal 2）
```powershell
cd frontend
npm run dev
```

開啟 Chrome 或 Edge 至 `http://localhost:3000`

**停止：** 在各自的終端機視窗按 `Ctrl+C`

---

## 測試帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin123 | 管理員 |
| nurse1 | nurse123 | 護理師 |
| nurse2 | nurse123 | 護理師 |
| doctor1 | doctor123 | 醫師 |

---

## 手機／行動裝置存取

在同一個網路下（例如手機開熱點，電腦連接）：

1. 電腦執行 `ipconfig`（Windows）或 `ifconfig`（Mac/Linux）找到 Wi-Fi IP
2. 手機瀏覽器開啟 `http://<電腦IP>:3000`
3. 語音功能需使用 **Android Chrome** 或 **iOS Safari**

若連線失敗，以系統管理員身分在 PowerShell 執行：
```powershell
netsh advfirewall firewall add rule name="HIS" dir=in action=allow protocol=TCP localport=3000-3001 profile=any
```

---

## AI 語音助理設定

### 使用 OpenAI（付費 API）

1. 前往 https://platform.openai.com/api-keys 取得 API Key
2. 登入系統後點選左側選單「系統設定」
3. 輸入 API Key，選擇模型（建議 `gpt-4o` 或省錢用 `gpt-4o-mini`）
4. 點「套用設定」

### 使用本地 LLM（免費，需自行安裝）

**Ollama**（推薦）：
```bash
# 安裝 Ollama: https://ollama.com
ollama pull llama3
ollama serve
```
設定頁面填入：
- API Key：`ollama`（任意字串）
- API 端點：`http://localhost:11434/v1`
- 模型：`llama3`

**LM Studio**：
- 下載 https://lmstudio.ai，載入模型後啟動本地伺服器
- API 端點：`http://localhost:1234/v1`

### 環境變數（正式部署）

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=http://localhost:11434/v1   # 選填
OPENAI_MODEL=gpt-4o                         # 選填
node src/server.js
```

---

## API 端點

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PUT    /api/patients/:id

GET    /api/patients/:id/history
PUT    /api/patients/:id/history
POST   /api/patients/:id/history/diagnoses
POST   /api/patients/:id/history/allergies

GET    /api/patients/:id/medications
POST   /api/patients/:id/medications
GET    /api/patients/:id/mar
POST   /api/patients/:id/mar

GET    /api/patients/:id/io
POST   /api/patients/:id/io
GET    /api/patients/:id/vitals
POST   /api/patients/:id/vitals
GET    /api/patients/:id/pe
POST   /api/patients/:id/pe
GET    /api/patients/:id/notes
POST   /api/patients/:id/notes

GET    /api/ai/status
POST   /api/ai/config
POST   /api/patients/:id/ai/chat
```

---

## 適用場景

- 護理之家 (Nursing Home)
- 老人福利機構
- 長期照護中心
- 社區型日照中心（延伸應用）
