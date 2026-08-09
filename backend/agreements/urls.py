from django.urls import path

from .views import (
    AgreementAcknowledgeView,
    AgreementDetailView,
    AgreementListView,
    AgreementTerminateView,
    AgreementPDFDownloadView,
    AgreementUploadSignedView,
    AgreementPayAdvanceView,
    AgreementProposeRenewalView,
    AgreementRespondRenewalView,
    AgreementAdminListView,
)

urlpatterns = [
    path('', AgreementListView.as_view()),
    path('admin/all/', AgreementAdminListView.as_view()),
    path('<uuid:id>/', AgreementDetailView.as_view()),
    path('<uuid:id>/upload-signed/', AgreementUploadSignedView.as_view()),
    path('<uuid:id>/acknowledge/', AgreementAcknowledgeView.as_view()),
    path('<uuid:id>/terminate/', AgreementTerminateView.as_view()),
    path('<uuid:id>/pdf/', AgreementPDFDownloadView.as_view()),
    path('<uuid:id>/download-pdf/', AgreementPDFDownloadView.as_view()),
    path('<uuid:id>/pay-advance/', AgreementPayAdvanceView.as_view()),
    path('<uuid:id>/propose-renewal/', AgreementProposeRenewalView.as_view()),
    path('<uuid:id>/respond-renewal/', AgreementRespondRenewalView.as_view()),
]