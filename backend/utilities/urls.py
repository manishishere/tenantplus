from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilityBillViewSet, UtilityMeterReadingViewSet

router = DefaultRouter()
router.register(r'bills', UtilityBillViewSet, basename='utilitybill')
router.register(r'readings', UtilityMeterReadingViewSet, basename='utilitymeterreading')

urlpatterns = [
    path('', include(router.urls)),
]
