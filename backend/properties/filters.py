import django_filters
from django_filters import BooleanFilter, CharFilter, NumberFilter

from .models import Property


class PropertyFilter(django_filters.FilterSet):
    """Filter properties for public listing queries."""

    min_rent = NumberFilter(field_name='rent_amount', lookup_expr='gte')
    max_rent = NumberFilter(field_name='rent_amount', lookup_expr='lte')
    district = CharFilter(field_name='district', lookup_expr='icontains')
    room_type = CharFilter(field_name='room_type', lookup_expr='exact')
    furnishing_status = CharFilter(field_name='furnishing_status', lookup_expr='exact')
    is_available = BooleanFilter(field_name='is_available')

    class Meta:
        model = Property
        fields = ['district', 'room_type', 'furnishing_status', 'is_available', 'min_rent', 'max_rent']
