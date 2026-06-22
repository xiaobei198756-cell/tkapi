from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import CollectionJob
from app.schemas import JobCreate, JobCreated, JobRead
from app.services.collector import ADAPTERS, run_collection_job
from app.services.websocket_manager import manager
from app.services.x_billing import billing_summary

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
ws_router = APIRouter(tags=["websocket"])


@router.post("", response_model=JobCreated)
async def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> JobCreated:
    platforms = [platform.lower().strip() for platform in payload.platforms]
    unsupported = [platform for platform in platforms if platform not in ADAPTERS]
    if unsupported:
        raise HTTPException(status_code=400, detail=f"Unsupported platforms: {', '.join(unsupported)}")
    settings = get_settings()
    if "x" in platforms:
        max_results = max(10, min(payload.max_results, settings.x_max_results_limit))
        estimated_cost = len(payload.keywords) * max_results * settings.x_post_read_unit_cost
        if billing_summary(db)["estimated_remaining_balance"] - estimated_cost <= 0:
            raise HTTPException(
                status_code=402,
                detail="Estimated X balance is insufficient. Please update balance or purchase credits.",
            )
        if payload.refresh_interval_minutes:
            raise HTTPException(status_code=400, detail="X does not allow automatic refresh unless explicitly enabled.")

    job = CollectionJob(
        keywords_json=json.dumps(payload.keywords, ensure_ascii=False),
        platforms_json=json.dumps(platforms, ensure_ascii=False),
        max_results=max(10, min(payload.max_results, settings.x_max_results_limit)) if "x" in platforms else payload.max_results,
        date_start=payload.date_start,
        date_end=payload.date_end,
        refresh_interval_minutes=payload.refresh_interval_minutes,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    asyncio.create_task(run_collection_job(job.id))
    return JobCreated(id=job.id, status=job.status)


@router.get("", response_model=list[JobRead])
def list_jobs(db: Session = Depends(get_db)) -> list[CollectionJob]:
    return list(db.execute(select(CollectionJob).order_by(CollectionJob.created_at.desc())).scalars())


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: int, db: Session = Depends(get_db)) -> CollectionJob:
    job = db.get(CollectionJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@ws_router.websocket("/ws/jobs/{job_id}")
async def job_socket(websocket: WebSocket, job_id: str) -> None:
    await manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id, websocket)
