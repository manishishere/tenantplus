import datetime
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from properties.models import Property
from applications.models import Application
from agreements.models import Agreement
from rent_payments.models import RentPayment

class PDFGenerationTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.landlord = User.objects.create_user(email='l@test.com', password='pw', role='landlord')
        self.tenant = User.objects.create_user(email='t@test.com', password='pw', role='tenant')
        self.property = Property.objects.create(landlord=self.landlord, title='Prop', address='Addr', rent_amount=100)
        self.app = Application.objects.create(tenant=self.tenant, property=self.property, status='accepted')
        self.agreement = Agreement.objects.create(
            application=self.app, tenant=self.tenant, landlord=self.landlord,
            property=self.property, rent_amount=100,
            start_date=datetime.date.today(), end_date=datetime.date.today()
        )
        self.payment = RentPayment.objects.create(
            agreement=self.agreement,
            amount=100,
            payment_month=datetime.date.today()
        )

    def test_agreement_pdf_download(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(f'/api/agreements/{self.agreement.id}/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_receipt_pdf_download(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(f'/api/rent-payments/{self.payment.id}/receipt/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
