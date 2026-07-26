from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import auth, cart, catalog, health, orders, payments, receipts, rentals, reservations, sessions, webhooks
from app.api.routes.admin import (
    audit,
    categories,
    customers,
    dashboard,
    finance,
    orders as admin_orders,
    payments as admin_payments,
    products,
    receipts as admin_receipts,
    rent_reserve,
    sessions as admin_sessions,
    site_content,
    staff,
    uploads,
)
from app.core.config import settings
from app.core.errors import error_body, register_exception_handlers
from app.core.rate_limit import limiter

app = FastAPI(title=settings.app_name, debug=settings.debug)

register_exception_handlers(app)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content=error_body("rate_limit_exceeded", "Too many requests. Please try again later."),
    )


app.add_middleware(SlowAPIMiddleware)

_cors_origins = ["*"] if settings.debug else [settings.frontend_url]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(sessions.router)
app.include_router(rentals.router)
app.include_router(reservations.router)
app.include_router(orders.router)
app.include_router(receipts.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
app.include_router(staff.router)
app.include_router(dashboard.router)
app.include_router(admin_payments.router)
app.include_router(customers.router)
app.include_router(finance.router)
app.include_router(audit.router)
app.include_router(admin_sessions.router)
app.include_router(admin_orders.router)
app.include_router(admin_receipts.router)
app.include_router(rent_reserve.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(site_content.router)
app.include_router(uploads.router)
