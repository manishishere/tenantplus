from rest_framework import serializers
from .models import Conversation, ChatMessage
from accounts.models import User
from properties.models import Property


class UserChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'conversation',
            'sender',
            'sender_name',
            'sender_role',
            'recipient',
            'content',
            'attachment_url',
            'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'sender', 'recipient', 'is_read', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    landlord_detail = UserChatSerializer(source='landlord', read_only=True)
    tenant_detail = UserChatSerializer(source='tenant', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True, default='General Tenancy Inquiry')
    last_message = serializers.SerializerMethodField(method_name='get_last_message')
    unread_count = serializers.SerializerMethodField(method_name='get_unread_count')

    class Meta:
        model = Conversation
        fields = [
            'id',
            'landlord',
            'landlord_detail',
            'tenant',
            'tenant_detail',
            'property',
            'property_title',
            'last_message',
            'unread_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return ChatMessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(recipient=request.user, is_read=False).count()
        return 0
