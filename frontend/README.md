# GarbageAnalysis dashboard

The dashboard sends uploads to the Node/Express backend, which then forwards the
image to the Python ML service. Scan history and dashboard metrics are still
stored in the current browser only.

## Run locally

Start the ML API in one terminal:

```bash
cd ml
uvicorn app:app --reload --port 8000
```

Start the Node backend in a second terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Start the dashboard in a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The development server proxies `/api`
requests to `http://localhost:5000` by default. To use a different backend URL,
set `API_TARGET` before starting Vite (for example,
`API_TARGET=http://127.0.0.1:5001 npm run dev`).

In PowerShell, set a different API host before starting Vite with:

```powershell
$env:API_TARGET = "http://127.0.0.1:5001"
npm run dev
```

The ML model must be trained and available to the Python API for predictions to work.
