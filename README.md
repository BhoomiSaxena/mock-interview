# AI Mock Interview Assistant

Full-stack mock interview practice app.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Features:** Text interview, voice interview (record + speech-to-text), PDF resume upload + parsing, OpenAI-generated questions + answer evaluation

## Prerequisites

- Node.js **18+**

## Setup

### 1) Backend env

Edit `backend/.env`:

```env
PORT=5000
OPENAI_API_KEY=YOUR_REAL_OPENAI_KEY
```

- Use a real OpenAI API key value (typically starts with `sk-`).
- Don’t wrap it in quotes.
- Restart the backend after changing `.env`.

If you're using an OpenAI-compatible provider (example: Groq key starting with `gsk_`), you can set:

```env
OPENAI_BASE_URL=https://api.groq.com/openai/v1
```

(Optional) allow a different frontend origin:

```env
CORS_ORIGIN=http://localhost:5173
```

### 2) Install deps

From the project root:

```bash
npm run install:all
```

### 3) Run (dev)

Option A (recommended): run both together

```bash
npm run dev
```

Option B: run separately

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

## API Endpoints

- `POST /upload-resume` (multipart/form-data, field: `file`, PDF only)
- `POST /generate-question` (JSON)
- `POST /evaluate-answer` (JSON)

## Notes

- Voice transcription uses the browser **Web Speech API**; support varies by browser (Chrome tends to work best).
