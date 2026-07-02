from django.urls import path

from .views import (
    ApplicationDetailView,
    ApplicationListCreateView,
    ApplicationStatusUpdateView,
    ApplicationWithdrawView,
)

urlpatterns = [
    path('', ApplicationListCreateView.as_view()),
    path('<uuid:id>/', ApplicationDetailView.as_view()),
    path('<uuid:id>/status/', ApplicationStatusUpdateView.as_view()),
    path('<uuid:id>/withdraw/', ApplicationWithdrawView.as_view()),
]