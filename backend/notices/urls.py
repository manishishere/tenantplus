from django.urls import path

from .views import NoticeAcknowledgeView, NoticeDetailView, NoticeListCreateView

urlpatterns = [
    path('', NoticeListCreateView.as_view()),
    path('<uuid:id>/', NoticeDetailView.as_view()),
    path('<uuid:id>/acknowledge/', NoticeAcknowledgeView.as_view()),
]