[**繁體中文**](README.zh-TW.md) | English

# Low-Cost Health Information System for Long-Term Care Settings

This repository contains a prototype health information system designed for under-resourced long-term care institutions in Taiwan. The project explores how low-cost digital infrastructure and optional AI-assisted workflows can reduce documentation burden and improve care coordination in settings where enterprise healthcare software may be financially or operationally unrealistic.

The target users include caregivers, nursing assistants, and long-term care staff with varying levels of digital literacy. In Taiwan, many frontline care workers are middle-aged, have limited formal technical training, or come from migrant worker backgrounds. For this reason, the system is designed around low-friction workflows rather than complex enterprise assumptions.

## Research Motivation

Many long-term care institutions face a mismatch between care documentation demands and available digital infrastructure. Expensive health information systems may be inaccessible to smaller facilities, while paper-based or fragmented workflows increase burden on caregivers and nurses.

This project asks how health information systems can be designed for care environments where budget, staffing, language, and digital literacy constraints are central rather than exceptional.

## System Goals

- Provide a low-cost HIS prototype for long-term care institutions.
- Support basic resident records, medication records, vital signs, intake/output, assessments, and nursing documentation.
- Reduce documentation burden for caregivers and nursing assistants.
- Explore optional AI-assisted documentation rather than mandatory AI replacement.
- Support voice-based workflows as a possible interface for users with limited typing comfort.

## Design Principle

AI should reduce friction in care work, not add another layer of complexity. For this reason, AI features in this project are treated as optional workflow support rather than the core requirement for system use.

## Current Status and Limitations

This is an independent prototype exploring nursing workflow support in long-term care. It is not a production clinical system and has not yet been formally evaluated in care institutions. Future work includes usability testing, caregiver feedback, multilingual interface support, and evaluation of AI-assisted documentation quality and safety.

---

## Feature Modules

| Module | Description |
|--------|-------------|
| Resident Management | Basic info, admission/discharge management, alerts |
| Medical History | Chief complaint, present illness, past history, family history, surgical history, allergy records, diagnosis management |
| Medication Orders | Order entry, discontinuation management, multiple routes/frequencies |
| Medication Administration Record (MAR) | Daily administration records, status tracking (given / held / refused / unavailable) |
| Intake & Output | Daily fluid intake/output records, fluid balance calculation |
| Vital Signs | BP / HR / RR / Temp / SpO₂ / Weight / Blood glucose / Pain scale |
| Physical Examination (PE Sheet) | Systematic body assessment, Morse Fall Scale, Braden Scale |
| Nursing Notes | SOAP format, DAR format, narrative nursing notes |
| AI Voice Assistant | Natural language care action input, auto-written to corresponding records |

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Authentication**: JWT Bearer Token
- **AI**: OpenAI GPT-4o (or any OpenAI-compatible API)
- **Voice**: Browser Web Speech API (zh-TW)

---

## Quick Start

### Windows

**1. Install Node.js** (if not already installed)
Download the LTS version from https://nodejs.org and install.

**2. Clone the project**
```powershell
git clone <repo-url>
cd HIS
```

**3. Install dependencies**
```powershell
cd backend
npm install
cd ..\frontend
npm install
```

**4. Seed test data**
```powershell
cd ..\backend
node src/seed.js
```

**5. Start the backend** (open a terminal window)
```powershell
cd backend
node src/server.js
```
You should see `Server running on port 3001`.

**6. Start the frontend** (open another terminal window)
```powershell
cd frontend
npm run dev
```
You should see `Local: http://localhost:3000/`.

**7. Open browser** (Chrome or Edge recommended)
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

## Test Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| nurse1 | nurse123 | Nurse |
| nurse2 | nurse123 | Nurse |
| doctor1 | doctor123 | Physician |

---

## Mobile Access

On the same network (e.g., phone hotspot with computer connected):

1. Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) on the computer to find the Wi-Fi IP
2. Open `http://<computer-IP>:3000` in the phone browser
3. Voice features require **Android Chrome** or **iOS Safari**

If the connection fails, run the following in PowerShell as administrator:
```powershell
netsh advfirewall firewall add rule name="HIS" dir=in action=allow protocol=TCP localport=3000-3001 profile=any
```

---

## AI Voice Assistant Setup

### Using OpenAI (Paid API)

1. Go to https://platform.openai.com/api-keys to get an API Key
2. Log in to the system and click "System Settings" in the sidebar
3. Enter the API Key, select a model (`gpt-4o` recommended, or `gpt-4o-mini` for lower cost)
4. Click "Apply Settings"

### Using a Local LLM (Free, self-hosted)

**Ollama** (recommended):
```bash
# Install Ollama: https://ollama.com
ollama pull llama3
ollama serve
```
In the settings page, enter:
- API Key: `ollama` (any string)
- API Endpoint: `http://localhost:11434/v1`
- Model: `llama3`

**LM Studio**:
- Download from https://lmstudio.ai, load a model, and start the local server
- API Endpoint: `http://localhost:1234/v1`

### Environment Variables (Production Deployment)

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=http://localhost:11434/v1   # optional
OPENAI_MODEL=gpt-4o                         # optional
node src/server.js
```

---

## API Endpoints

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

## Target Settings

- Nursing homes
- Senior welfare institutions
- Long-term care centers
- Community day-care centers (extended application)
