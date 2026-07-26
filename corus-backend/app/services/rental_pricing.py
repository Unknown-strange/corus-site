from datetime import date
from decimal import Decimal


def calculate_rental_days(start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days
    return max(days, 1)


def calculate_rental_price(daily_rate_ghs: Decimal, start_date: date, end_date: date) -> tuple[int, Decimal]:
    rental_days = calculate_rental_days(start_date, end_date)
    total_price = daily_rate_ghs * rental_days
    return rental_days, total_price
