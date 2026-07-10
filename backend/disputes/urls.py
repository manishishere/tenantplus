from django.urls import path

from .views import DisputeDetailView, DisputeListCreateView, DisputeResolveView

urlpatterns = [
    path('', DisputeListCreateView.as_view()),
    path('<uuid:id>/', DisputeDetailView.as_view()),
    path('<uuid:id>/resolve/', DisputeResolveView.as_view()),
]