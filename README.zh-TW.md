繁體中文 | [**English**](README.md)

# 低成本長期照護健康資訊系統

本專案為一套針對台灣資源有限之長期照護機構所設計的健康資訊系統原型。探索如何透過低成本數位基礎建設與選擇性 AI 輔助工作流程，減輕照護文書負擔、改善照護協調，以因應企業級醫療資訊系統在財務或營運層面不切實際的場景。

目標使用者涵蓋照護員、護理助理，以及具備不同數位素養程度的長照工作人員。在台灣，許多第一線照護工作者為中年族群，正規技術訓練有限，或具有移工背景。因此，本系統以低摩擦工作流程為設計核心，而非依賴複雜的企業級系統假設。

## 研究動機

許多長期照護機構面臨照護文書需求與現有數位基礎建設之間的落差。高價的健康資訊系統對小型機構而言可能難以負擔，而紙本或零散的工作流程則加重照護員與護理人員的負擔。

本專案探討：在預算、人力、語言與數位素養等限制條件為常態而非例外的照護環境中，健康資訊系統應如何設計？

## 系統目標

- 提供適用於長期照護機構的低成本 HIS 原型。
- 支援基本住民記錄、用藥記錄、生命徵象、出入量、評估及護理文書。
- 減輕照護員與護理助理的文書負擔。
- 探索選擇性 AI 輔助文書，而非強制性 AI 取代。
- 支援語音操作工作流程，作為不擅長打字之使用者的可能介面。

## 設計原則

AI 應減少照護工作的摩擦，而非增加另一層複雜度。因此，本專案中的 AI 功能被定位為選擇性的工作流程輔助，而非系統運作的核心要求。

## 目前狀態與限制

本系統為獨立原型，探索長期照護中的護理工作流程支援。並非正式臨床系統，亦尚未於照護機構中進行正式評估。未來工作包含可用性測試、照護人員回饋、多語介面支援，以及 AI 輔助文書品質與安全性之評估。

---

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

**4. 建立測試資料**
```powershell
cd ..\backend
node src/seed.js
```

**5. 啟動後端**（開一個終端機視窗）
```powershell
cd backend
node src/server.js
```
看到 `Server running on port 3001` 即成功。

**6. 啟動前端**（開另一個終端機視窗）
```powershell
cd frontend
npm run dev
```
看到 `Local: http://localhost:3000/` 即成功。

**7. 開啟瀏覽器**（建議使用 Chrome 或 Edge）
```
http://localhost:3000
```

### macOS / Linux

```bash
cd backend && npm install && cd ../frontend && npm install
cd ../backend && node src/seed.js
# Terminal 1
cd backend && node src/server.js
# Terminal 2
cd frontend && npm run dev
```

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
