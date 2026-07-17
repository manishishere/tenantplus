from django.urls import path

from .views import (
    AgreementAcknowledgeView,
    AgreementDetailView,
    AgreementListView,
    AgreementTerminateView,
    AgreementPDFDownloadView,
)

urlpatterns = [
    path('', AgreementListView.as_view()),
    path('<uuid:id>/', AgreementDetailView.as_view()),
    path('<uuid:id>/acknowledge/', AgreementAcknowledgeView.as_view()),
    path('<uuid:id>/terminate/', AgreementTerminateView.as_view()),
    path('<uuid:id>/pdf/', AgreementPDFDownloadView.as_view()),
]