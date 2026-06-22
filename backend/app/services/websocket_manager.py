import asyncio
from collections import defaultdict
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[job_id].add(websocket)

    async def disconnect(self, job_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections[job_id].discard(websocket)
            if not self._connections[job_id]:
                self._connections.pop(job_id, None)

    async def broadcast(self, job_id: str, payload: dict) -> None:
        async with self._lock:
            targets = list(self._connections.get(job_id, set()))
        for websocket in targets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.disconnect(job_id, websocket)


manager = WebSocketManager()
