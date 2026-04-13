# 台灣長照資訊系統 (LTC-HIS)

台灣長期照護場景之醫療資訊系統，提供完整的住民照護記錄管理功能。

## 功能模組

| 模組 | 功能 |
|------|------|
| 住民管理 | 基本資料、入退住管理 |
| 病史記錄 | 主訴、現病史、過去病史、家族史、手術史、過敏記錄、診斷管理 |
| 用藥醫囑 | 開立醫囑、停藥管理、多種給藥途徑/頻率 |
| 用藥記錄 (MAR) | 每日給藥記錄、給藥狀態追蹤（已給/暫停/拒絕/無藥）|
| 出入量記錄 | 每日液體攝入/排出量記錄、體液平衡計算 |
| 生命徵象 | 血壓/心率/呼吸/體溫/血氧/體重/血糖/疼痛指數 |
| 身體評估 (PE Sheet) | 全身系統評估、跌倒風險(Morse Fall Scale)、壓傷風險(Braden Scale) |
| 護理記錄 | SOAP格式、DAR格式、敘述型護理記錄 |

## 技術架構

- **後端**: Node.js + Express + SQLite (better-sqlite3)
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **認證**: JWT Bearer Token

## 快速開始

### 1. 安裝依賴

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 建立測試資料

```bash
cd backend && npm run seed
```

### 3. 啟動服務

```bash
# 後端 (Port 3001)
cd backend && npm run dev

# 前端 (Port 3000)
cd frontend && npm run dev
```

### 4. 登入系統

開啟瀏覽器至 http://localhost:3000

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin123 | 管理員 |
| nurse1 | nurse123 | 護理師 |
| nurse2 | nurse123 | 護理師 |
| doctor1 | doctor123 | 醫師 |

## API 端點

```
POST   /api/auth/login              登入
GET    /api/auth/me                 取得目前使用者

GET    /api/patients                住民列表
POST   /api/patients                新增住民
GET    /api/patients/:id            住民資料
PUT    /api/patients/:id            更新住民資料

GET    /api/patients/:id/history    病史記錄
PUT    /api/patients/:id/history    更新病史
POST   /api/patients/:id/history/diagnoses   新增診斷
POST   /api/patients/:id/history/allergies   新增過敏

GET    /api/patients/:id/medications         用藥醫囑
POST   /api/patients/:id/medications         新增醫囑
GET    /api/patients/:id/mar                 MAR記錄
POST   /api/patients/:id/mar                 記錄給藥

GET    /api/patients/:id/io                  出入量記錄
POST   /api/patients/:id/io                  新增出入量
GET    /api/patients/:id/vitals              生命徵象
POST   /api/patients/:id/vitals              新增生命徵象
GET    /api/patients/:id/pe                  身體評估
POST   /api/patients/:id/pe                  新增身體評估
GET    /api/patients/:id/notes               護理記錄
POST   /api/patients/:id/notes               新增護理記錄
```

## 適用場景

- 護理之家 (Nursing Home)
- 老人福利機構
- 長期照護中心
- 社區型日照中心 (延伸應用)
