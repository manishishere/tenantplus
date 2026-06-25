from django.urls import path

from .views import (
    MyListingsView,
    PropertyDetailView,
    PropertyListCreateView,
    PropertyPhotoDeleteView,
    PropertyPhotoListCreateView,
    SavedPropertyListView,
    SavedPropertyToggleView,
    ToggleAvailabilityView,
)

urlpatterns = [
    path('', PropertyListCreateView.as_view()),
    path('<uuid:id>/', PropertyDetailView.as_view()),
    path('my-listings/', MyListingsView.as_view()),
    path('<uuid:id>/toggle-availability/', ToggleAvailabilityView.as_view()),
    path('<uuid:id>/photos/', PropertyPhotoListCreateView.as_view()),
    path('<uuid:id>/photos/<uuid:photo_id>/', PropertyPhotoDeleteView.as_view()),
    path('saved/', SavedPropertyListView.as_view()),
    path('<uuid:id>/save/', SavedPropertyToggleView.as_view()),
]
