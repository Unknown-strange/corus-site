from fastapi import APIRouter

from app.core.deps import DbSession
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: DbSession) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
