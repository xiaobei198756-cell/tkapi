import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar
import httpx
from app.config import get_settings

T = TypeVar("T")


async def retry_async(fn: Callable[[], Awaitable[T]]) -> T:
    settings = get_settings()
    last_error: Exception | None = None
    for attempt in range(settings.adapter_max_retries + 1):
        try:
            return await fn()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt >= settings.adapter_max_retries:
                break
            await asyncio.sleep(settings.adapter_retry_base_seconds * (2**attempt))
    assert last_error is not None
    raise last_error
