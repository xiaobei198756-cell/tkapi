# Local Render Testing

Use these commands from the project root before deploying to Render.

## 1. Install backend dependencies

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 2. Install frontend dependencies

```powershell
cd ..\frontend
npm ci
```

## 3. Build frontend

```powershell
npm run build
```

The build output must exist at `frontend/dist/index.html`.

## 4. Start backend

```powershell
cd ..\backend
$env:PORT=8000
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port $env:PORT
```

Render uses the same app target with its own `$PORT` value:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 5. Test health and API routes

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/api/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/api/platform-status -UseBasicParsing
```

## 6. Test frontend refresh routes

```powershell
Invoke-WebRequest http://127.0.0.1:8000/ -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/keywords -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/rankings -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:8000/settings/tiktok -UseBasicParsing
```

All commands should return HTTP 200.
