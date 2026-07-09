from django.urls import path

from .views import InspectionDetailView, InspectionListCreateView

urlpatterns = [
    path('', InspectionListCreateView.as_view()),
    path('<uuid:id>/', InspectionDetailView.as_view()),
]
