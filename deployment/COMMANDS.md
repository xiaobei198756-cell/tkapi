# Commands

Backend tests:

```powershell
cd backend
pytest
```

Frontend build:

```powershell
cd frontend
npm run build
```

Platform collector scripts:

```powershell
python scripts/youtube_collector.py "crypto" --max-results 5
python scripts/x_collector.py "crypto" --max-results 10
python scripts/tiktok_collector.py "crypto" --max-results 10
python scripts/instagram_collector.py "crypto" --max-results 10
python scripts/facebook_collector.py "crypto" --max-results 10
```
