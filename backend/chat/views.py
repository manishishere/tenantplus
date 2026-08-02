from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Conversation, ChatMessage
from .serializers import ConversationSerializer, ChatMessageSerializer
from accounts.models import User
from properties.models import Property


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(
            Q(landlord=user) | Q(tenant=user)
        ).select_related('landlord', 'tenant', 'property')

    def create(self, request, *args, **kwargs):
        other_user_id = request.data.get('other_user_id')
        property_id = request.data.get('property_id')

        if not other_user_id:
            return Response({'detail': 'other_user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user == other_user:
            return Response({'detail': 'Cannot chat with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine Landlord and Tenant
        if request.user.role == 'landlord':
            landlord = request.user
            tenant = other_user
        elif other_user.role == 'landlord':
            landlord = other_user
            tenant = request.user
        else:
            landlord = request.user
            tenant = other_user

        prop_obj = None
        if property_id:
            try:
                prop_obj = Property.objects.get(id=property_id)
            except Property.DoesNotExist:
                pass

        conversation = Conversation.objects.filter(
            landlord=landlord,
            tenant=tenant
        ).first()

        created = False
        if not conversation:
            conversation = Conversation.objects.create(
                landlord=landlord,
                tenant=tenant,
                property=prop_obj
            )
            created = True
        elif prop_obj and not conversation.property:
            conversation.property = prop_obj
            conversation.save()

        serializer = self.get_serializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ChatMessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        return ChatMessage.objects.filter(
            conversation_id=conversation_id
        ).select_related('sender', 'recipient')

    def list(self, request, *args, **kwargs):
        conversation_id = self.kwargs.get('conversation_id')
        # Mark incoming unread messages as read
        ChatMessage.objects.filter(
            conversation_id=conversation_id,
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        conversation_id = self.kwargs.get('conversation_id')
        content = request.data.get('content', '').strip()
        attachment_url = request.data.get('attachment_url', '').strip()

        if not content and not attachment_url:
            return Response({'detail': 'Message content or attachment is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user not in [conversation.landlord, conversation.tenant]:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        recipient = conversation.tenant if request.user == conversation.landlord else conversation.landlord

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            recipient=recipient,
            content=content,
            attachment_url=attachment_url
        )

        # Update conversation timestamp
        conversation.save()

        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)



