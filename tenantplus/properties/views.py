from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsLandlord, IsTenant
from .filters import PropertyFilter
from .models import Property, PropertyPhoto, SavedProperty
from .pagination import PropertyPagination
from .permissions import IsPropertyOwner
from .serializers import (
    PropertyCreateUpdateSerializer,
    PropertyDetailSerializer,
    PropertyListSerializer,
    PropertyPhotoSerializer,
    SavedPropertySerializer,
)


class PropertyListCreateView(APIView):
    """List available properties publicly and allow landlords to create listings."""

    permission_classes = [AllowAny]
    pagination_class = PropertyPagination
    search_fields = ['title', 'description', 'district']
    ordering_fields = ['rent_amount', 'created_at']

    def get(self, request, *args, **kwargs):
        """Return available properties filtered, searched, ordered, and paginated."""
        queryset = Property.objects.filter(is_available=True)
        queryset = PropertyFilter(request.GET, queryset=queryset).qs

        search_query = request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(district__icontains=search_query)
            )

        ordering = request.query_params.get('ordering', '-created_at')
        ordering_field = ordering.lstrip('-')
        if ordering_field in self.ordering_fields:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = PropertyListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, *args, **kwargs):
        """Create a new property listing for the authenticated landlord."""
        # Landlord-only write access is enforced here; tenants cannot create listings.
        if not IsLandlord().has_permission(request, self):
            return Response({'detail': 'Only landlords can create properties.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PropertyCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        property_obj = serializer.save(landlord=request.user)
        return Response(PropertyDetailSerializer(property_obj).data, status=status.HTTP_201_CREATED)


class PropertyDetailView(APIView):
    """Retrieve, update, or delete a single property listing."""

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """Return the detail view for a property."""
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        return Response(PropertyDetailSerializer(property_obj).data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        """Allow the owning landlord to update a property listing."""
        # This view combines landlord access with object-level ownership checks.
        if not IsLandlord().has_permission(request, self):
            return Response({'detail': 'Only landlords can update properties.'}, status=status.HTTP_403_FORBIDDEN)
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        if not IsPropertyOwner().has_object_permission(request, self, property_obj):
            return Response({'detail': 'You do not own this property.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PropertyCreateUpdateSerializer(property_obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PropertyDetailSerializer(property_obj).data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        """Delete a property if it has no active agreement and the user owns it."""
        # Landlords can only delete their own properties, and active tenancies block deletion.
        if not IsLandlord().has_permission(request, self):
            return Response({'detail': 'Only landlords can delete properties.'}, status=status.HTTP_403_FORBIDDEN)
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        if not IsPropertyOwner().has_object_permission(request, self, property_obj):
            return Response({'detail': 'You do not own this property.'}, status=status.HTTP_403_FORBIDDEN)
        if hasattr(property_obj, 'agreements') and property_obj.agreements.exists():
            return Response({'detail': 'Cannot delete a property with an active tenancy.'}, status=status.HTTP_400_BAD_REQUEST)
        property_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyListingsView(APIView):
    """Return all listings owned by the current landlord."""

    permission_classes = [IsLandlord]

    def get(self, request, *args, **kwargs):
        """Return every property belonging to the authenticated landlord."""
        # This endpoint is landlord-only and includes all listings regardless of availability.
        listings = Property.objects.filter(landlord=request.user).order_by('-created_at')
        serializer = PropertyListSerializer(listings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ToggleAvailabilityView(APIView):
    """Toggle the availability flag for a property listing."""

    permission_classes = [IsLandlord]

    def patch(self, request, *args, **kwargs):
        """Flip the availability state and respond with the updated value."""
        # This toggle is restricted to the property owner and uses the same landlord-only permission.
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        if not IsPropertyOwner().has_object_permission(request, self, property_obj):
            return Response({'detail': 'You do not own this property.'}, status=status.HTTP_403_FORBIDDEN)
        property_obj.is_available = not property_obj.is_available
        property_obj.save()
        detail = 'Property marked as available.' if property_obj.is_available else 'Property marked as unavailable.'
        return Response(
            {
                'id': str(property_obj.id),
                'is_available': property_obj.is_available,
                'detail': detail,
            },
            status=status.HTTP_200_OK,
        )


class PropertyPhotoListCreateView(APIView):
    """List or create photos for a specific property."""

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """Return all photos for the property ordered by sort order."""
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        photos = property_obj.photos.all().order_by('sort_order')
        serializer = PropertyPhotoSerializer(photos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Allow an owner landlord to attach a photo to a property."""
        # Photo uploads are owner-only and therefore restricted to landlords.
        if not IsLandlord().has_permission(request, self):
            return Response({'detail': 'Only landlords can upload property photos.'}, status=status.HTTP_403_FORBIDDEN)
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        if not IsPropertyOwner().has_object_permission(request, self, property_obj):
            return Response({'detail': 'You do not own this property.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PropertyPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(property=property_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PropertyPhotoDeleteView(APIView):
    """Delete a photo from a property listing."""

    permission_classes = [IsLandlord]

    def delete(self, request, *args, **kwargs):
        """Delete a property photo if it belongs to the current property's owner."""
        # Photo deletion requires landlord ownership of the parent property.
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        if not IsPropertyOwner().has_object_permission(request, self, property_obj):
            return Response({'detail': 'You do not own this property.'}, status=status.HTTP_403_FORBIDDEN)
        photo = get_object_or_404(PropertyPhoto, id=kwargs['photo_id'], property=property_obj)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedPropertyListView(APIView):
    """Return the properties saved by the current tenant."""

    permission_classes = [IsTenant]

    def get(self, request, *args, **kwargs):
        """Return all saved properties for the authenticated tenant."""
        # This endpoint is tenant-only and shows only the current tenant's saved listings.
        saved_properties = SavedProperty.objects.filter(tenant=request.user).order_by('-saved_at')
        serializer = SavedPropertySerializer(saved_properties, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SavedPropertyToggleView(APIView):
    """Toggle whether a property is saved for the current tenant."""

    permission_classes = [IsTenant]

    def post(self, request, *args, **kwargs):
        """Create or remove a saved-property relationship as a toggle."""
        # Tenants can save or unsave a property; landlords cannot use this endpoint.
        property_obj = get_object_or_404(Property, id=kwargs['id'])
        saved_property, created = SavedProperty.objects.get_or_create(tenant=request.user, property=property_obj)
        if created:
            return Response({'saved': True, 'detail': 'Property saved.'}, status=status.HTTP_201_CREATED)
        saved_property.delete()
        return Response({'saved': False, 'detail': 'Property removed from saved.'}, status=status.HTTP_200_OK)
