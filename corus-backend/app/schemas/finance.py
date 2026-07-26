from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class FinancialRecordResponse(BaseModel):
    id: UUID
    record_type: str
    source: str
    amount_ghs: Decimal
    record_date: datetime
    category: str
    description: str | None
    source_label: str | None
    payment_id: UUID | None
    created_by_id: UUID | None
    updated_by_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinancialRecordCreateRequest(BaseModel):
    record_type: str = Field(description="income or expense")
    amount_ghs: Decimal = Field(gt=0)
    record_date: datetime
    category: str
    description: str | None = None
    source_label: str | None = Field(default=None, max_length=255)


class FinancialRecordUpdateRequest(BaseModel):
    record_type: str | None = None
    amount_ghs: Decimal | None = Field(default=None, gt=0)
    record_date: datetime | None = None
    category: str | None = None
    description: str | None = None
    source_label: str | None = Field(default=None, max_length=255)


class FinanceSummaryResponse(BaseModel):
    total_income_ghs: Decimal
    total_expenses_ghs: Decimal
    profit_ghs: Decimal
    record_count: int
    period_start: datetime
    period_end: datetime


class FinanceAlertItem(BaseModel):
    alert_type: str
    message: str
    threshold_ghs: Decimal | None = None
    actual_ghs: Decimal | None = None


class FinanceAlertsResponse(BaseModel):
    alerts: list[FinanceAlertItem]
    period_start: datetime
    period_end: datetime
