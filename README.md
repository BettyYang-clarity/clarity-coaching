# Clarity Coaching System
### 教練紀錄與分析系統

> An AI-assisted, local-first coaching session recorder built for professional coaches.  
> 以 AI 輔助、資料留本機為核心的教練會談紀錄系統。

---

## ✨ Features / 功能

| 功能 | 說明 |
|---|---|
| 📋 **Session Prep** 會談準備 | 自動帶入上次 Snapshot、未完成行動、6 項檢查清單 |
| ✏️ **Quick Capture** 快速記錄 | 低摩擦記錄，自動存檔（2 秒 debounce） |
| 🤖 **AI Organizer** AI 整理 | Gemini 將草稿整理成結構化 GROW 紀錄 |
| 💬 **AI Assistant** AI 助手 | 即時對話，帶入客戶脈絡，提供方向建議 |
| 👤 **Clients** 客戶管理 | 完整 CRUD、會談時間線、Snapshot 快覽 |
| 📁 **Sessions** 會談歷史 | GROW 狀態分析、教練私記、轉介旗標 |
| ✅ **Actions** 行動追蹤 | 看板 + 表格雙模式、逾期自動標示 |
| 📚 **Tool Library** 工具庫 | 8 個內建工具 + 自訂工具管理 |
| 📈 **Case Study** 案例分析 | 跨會談主題分析 |
| ⚙️ **Data Manager** 資料管理 | JSON 備份還原、CSV 匯出、API Key 設定 |

---

## 🏗️ Architecture / 技術架構

```
clarity-coaching/
├── server/                  # Express.js backend
│   ├── db.js                # sql.js (SQLite WASM) wrapper
│   ├── routes/              # REST API routes
│   └── services/            # AI + data export services
├── src/                     # Vite frontend (Vanilla JS SPA)
│   ├── css/index.css        # Design system (glassmorphism)
│   └── js/
│       ├── app.js           # Hash router
│       ├── components/      # 10 page components
│       └── utils/api.js     # API wrapper
└── package.json
```

**Stack:** Vite · Express.js · sql.js (SQLite WASM) · Google Gemini API

---

## 🚀 Getting Started / 快速開始

### Prerequisites / 環境需求
- Node.js v18+
- A Google Gemini API key (for AI features)

### Install & Run / 安裝與啟動

```bash
# 1. Clone the repo
git clone https://github.com/BettyYang-clarity/clarity-coaching.git
cd clarity-coaching

# 2. Install dependencies
npm install

# 3. Start both servers concurrently
npm run dev
```

Open **http://localhost:5173** in your browser.

### Set up AI / 設定 AI 功能

1. Go to ⚙️ **資料管理 / Data Manager**
2. Enter your **Gemini API Key** (get one at https://aistudio.google.com/apikey)
3. Click **儲存金鑰 / Save Key**

---

## 📦 Scripts / 指令

| Command | Description |
|---|---|
| `npm run dev` | Start frontend (port 5173) + backend (port 3001) |
| `npm run server` | Backend only |
| `npm run client` | Frontend only |
| `npm run build` | Production build |

---

## 🔒 Privacy / 隱私設計

- All coaching data is stored **locally** in `server/data/clarity.db` (SQLite)
- AI is only invoked when **explicitly triggered** by the coach
- Private coach reflections (🔒) are **never shared** with clients
- Database file is excluded from git via `.gitignore`

---

## 📄 License

MIT © BettyYang-clarity
