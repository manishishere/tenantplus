from django.urls import path

from .views import MaintenanceDetailView, MaintenanceListCreateView

urlpatterns = [
    path('', MaintenanceListCreateView.as_view()),
    path('<uuid:id>/', MaintenanceDetailView.as_view()),
]
