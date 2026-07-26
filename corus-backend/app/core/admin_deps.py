from typing import Annotated

from fastapi import Depends

from app.core.deps import require_admin, require_any_permission, require_permission
from app.core.permissions import StaffPermission
from app.models.user import User

DashboardViewUser = Annotated[User, Depends(require_permission(StaffPermission.dashboard_view))]
OrdersViewUser = Annotated[User, Depends(require_permission(StaffPermission.orders_view))]
OrdersManageUser = Annotated[User, Depends(require_permission(StaffPermission.orders_manage))]
BookingsViewUser = Annotated[User, Depends(require_permission(StaffPermission.bookings_view))]
ReservationsViewUser = Annotated[User, Depends(require_permission(StaffPermission.reservations_view))]
ReservationsApproveUser = Annotated[User, Depends(require_permission(StaffPermission.reservations_approve))]
RentalsViewUser = Annotated[User, Depends(require_permission(StaffPermission.rentals_view))]
RentalsManageUser = Annotated[User, Depends(require_permission(StaffPermission.rentals_manage))]
ReceiptsViewUser = Annotated[User, Depends(require_permission(StaffPermission.receipts_view))]
PaymentsViewUser = Annotated[User, Depends(require_permission(StaffPermission.payments_view))]
CustomersViewUser = Annotated[User, Depends(require_permission(StaffPermission.customers_view))]
ProductsViewUser = Annotated[User, Depends(require_permission(StaffPermission.products_view))]
ProductsManageUser = Annotated[User, Depends(require_permission(StaffPermission.products_manage))]
CmsManageUser = Annotated[User, Depends(require_permission(StaffPermission.cms_manage))]
SessionsManageUser = Annotated[User, Depends(require_permission(StaffPermission.sessions_manage))]
FinanceViewUser = Annotated[User, Depends(require_permission(StaffPermission.finance_view))]
FinanceManageUser = Annotated[User, Depends(require_permission(StaffPermission.finance_manage))]
UploadUser = Annotated[
    User,
    Depends(
        require_any_permission(
            StaffPermission.products_manage,
            StaffPermission.cms_manage,
            StaffPermission.rentals_manage,
        )
    ),
]
AdminOnlyUser = Annotated[User, Depends(require_admin)]
