# Kaizen Stock Control

Industrial stock data dashboard for maintaining item quantities, CSV/XLSX imports, CSV export, image references, and stock movement history.

> **🤖 Complete with Telegram Agent System** - Full agentic system for inventory management via Telegram bot powered by Ollama.

## Quick Start

### Setup (First Time Only)
1. **Configure environment:** Copy `.env.example` to `.env` and fill in your credentials
   ```powershell
   Copy-Item .env.example .env
   notepad .env  # Edit with your Telegram token and chat ID
   ```

2. **Setup Ollama LLM:**
   - Download from https://ollama.ai
   - Run `ollama serve` in a separate terminal
   - Pull model: `ollama pull llama2:7b`

3. **Get Telegram Bot Token:**
   - Message @BotFather on Telegram
   - Create new bot and get token
   - Get your chat ID from @userinfobot

📖 **Complete Setup Guide:** See [AGENT_SETUP.md](AGENT_SETUP.md)

### Run

#### Complete System (API + Web UI + Telegram Bot)
```powershell
npm run dev:all
```

#### Just API & Web UI
```powershell
npm run dev
```

#### Production
```powershell
npm start
```

Open `http://localhost:4174`.

**Admin credentials:**
- ID: `admin`
- Password: `admin`

## Data

- SQLite database: `storage/stock.db`
- Uploaded images: `storage/images`
- Imported files: `storage/imports`
- Cached thumbnails: `storage/thumbnails`
- Existing source photos: `img`
- CSV export: `http://localhost:4174/api/export.csv`

The current `Data_Barang_19.xlsx` file has been imported into `storage/stock.db`.

Images in the inventory table use cached WebP thumbnails from `/api/images/thumb` so each page does not load full camera photos. New image uploads are optimized to WebP before being attached to an item.

## Quality Gates

```powershell
npm test
npm run typecheck
npm run build
npm audit --audit-level=high
```

The test suite covers stock movement rules, CSV import mapping, CSV export, and an automated WCAG smoke test with `jest-axe`.
