from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional, Tuple

# In-memory waiter registry and short-lived cache
_waiters: Dict[str, List[asyncio.Future]] = {}
_cache: Dict[str, Tuple[Any, float]] = {}  # action_id -> (payload, expires_at)
_TTL_SECONDS = 30.0
_lock = asyncio.Lock()


async def wait_for(action_id: str, timeout_seconds: int = 8) -> Optional[dict]:
    """Wait for a deposit event for the given action_id without DB polling.

    - If a recent event is cached, return it immediately.
    - Otherwise, register a Future and await it up to timeout_seconds.
    - Returns payload dict or None on timeout.
    """
    if not action_id:
        return None

    now = time.monotonic()
    async with _lock:
        cached = _cache.get(action_id)
        if cached and cached[1] > now:
            return cached[0]

        fut: asyncio.Future = asyncio.get_running_loop().create_future()
        _waiters.setdefault(action_id, []).append(fut)

    try:
        return await asyncio.wait_for(fut, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        # Cleanup timed out future
        async with _lock:
            lst = _waiters.get(action_id, [])
            if fut in lst:
                lst.remove(fut)
                if not lst:
                    _waiters.pop(action_id, None)
        return None


async def notify(action_id: Optional[str], payload: dict) -> None:
    """Notify all waiters of a deposit event and cache it briefly."""
    if not action_id:
        return
    now = time.monotonic()
    async with _lock:
        # Cache for quick subsequent lookups
        _cache[action_id] = (payload, now + _TTL_SECONDS)

        lst = _waiters.pop(action_id, [])
        for fut in lst:
            if not fut.done():
                fut.set_result(payload)
