import datetime
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from properties.models import Property
from applications.models import Application
from agreements.models import Agreement

class UtilityBillPermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.landlord = User.objects.create_user(email='landlord@example.com', password='testpass123', role='landlord', full_name='Landlord')
        self.tenant = User.objects.create_user(email='tenant@example.com', password='testpass123', role='tenant', full_name='Tenant')
        
        # Create property
        self.property = Property.objects.create(landlord=self.landlord, title='Test Property', address='123 Main St', rent_amount=1000)
        
        # Create application
        self.application = Application.objects.create(tenant=self.tenant, property=self.property, status='accepted', message='Hi')
        
        # Create agreement
        self.agreement = Agreement.objects.create(
            application=self.application,
            tenant=self.tenant,
            landlord=self.landlord,
            property=self.property,
            rent_amount=1000,
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=365)
        )
        
        self.bill_data = {
            'agreement': self.agreement.id,
            'billing_month': datetime.date.today().strftime('%Y-%m-%d'),
            'total_amount': '150.00',
            'due_date': (datetime.date.today() + datetime.timedelta(days=14)).strftime('%Y-%m-%d'),
        }
        self.url = '/api/utilities/bills/'

    def test_landlord_can_create_utility_bill(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.post(self.url, self.bill_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_tenant_cannot_create_utility_bill(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(self.url, self.bill_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_tenant_can_list_utility_bills(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
