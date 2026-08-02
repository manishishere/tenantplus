from django.urls import path

from .views import (
    EsewaInitiateView,
    EsewaVerifyView,
    RentPaymentDetailView,
    RentPaymentListCreateView,
    RentPaymentSummaryView,
    RentPaymentReceiptDownloadView,
    SendRentReminderView,
)

urlpatterns = [
    path('', RentPaymentListCreateView.as_view()),
    path('summary/', RentPaymentSummaryView.as_view()),
    path('send-reminder/', SendRentReminderView.as_view()),
    path('esewa/initiate/', EsewaInitiateView.as_view()),
    path('esewa/verify/', EsewaVerifyView.as_view()),
    path('<uuid:id>/', RentPaymentDetailView.as_view()),
    path('<uuid:id>/receipt/', RentPaymentReceiptDownloadView.as_view()),
]
