from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models import (  # noqa: E402, F401
    booking,
    booking_settings,
    cart,
    cart_item,
    email_verification,
    equipment_for_rent,
    notification_log,
    order,
    order_item,
    payment,
    product,
    product_category,
    receipt,
    rental_request,
    session_type,
    site_content,
    slot_hold,
    studio_reservation,
    studio_slot,
    user,
)
