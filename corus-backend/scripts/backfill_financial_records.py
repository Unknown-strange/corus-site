"""Backfill financial_records from existing successful payments."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models.financial_record import FinancialRecord
from app.models.payment import Payment, PaymentStatus
from app.services.finance_service import sync_payment_to_ledger


def backfill_financial_records() -> None:
    db = SessionLocal()
    try:
        payments = db.query(Payment).filter(Payment.status == PaymentStatus.success).all()
        created = 0
        skipped = 0
        for payment in payments:
            existing = (
                db.query(FinancialRecord)
                .filter(FinancialRecord.payment_id == payment.id)
                .first()
            )
            if existing:
                skipped += 1
                continue
            sync_payment_to_ledger(db, payment)
            created += 1
        db.commit()
        print(f"Backfill complete: {created} created, {skipped} already existed")
    finally:
        db.close()


if __name__ == "__main__":
    backfill_financial_records()
