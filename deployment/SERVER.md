# Server Deployment

Local backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Local frontend:

```powershell
cd frontend
npm install
npm run dev
```

Production-style local run:

```powershell
cd frontend
npm install
npm run build
cd ..\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Health checks:

```text
GET /api/health
GET /api/platform-status
GET /api/youtube/status
GET /api/x/status
GET /api/tiktok/status
```
