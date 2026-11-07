from fastapi import APIRouter
from sqlalchemy import text

from app.core.deps import DbSession

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: DbSession) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
