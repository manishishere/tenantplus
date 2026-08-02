from django.urls import path
from .views import ConversationListCreateView, ChatMessageListCreateView

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('conversations/<uuid:conversation_id>/messages/', ChatMessageListCreateView.as_view(), name='chat-message-list-create'),
]
