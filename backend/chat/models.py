import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    landlord = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='landlord_conversations')
    tenant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tenant_conversations')
    property = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ('landlord', 'tenant', 'property')

    def __str__(self):
        prop_title = self.property.title if self.property else 'General'
        return f"Chat: {self.landlord.full_name} & {self.tenant.full_name} ({prop_title})"


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_chat_messages')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_chat_messages')
    content = models.TextField()
    attachment_url = models.CharField(max_length=500, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.full_name} -> {self.recipient.full_name}: {self.content[:30]}"
