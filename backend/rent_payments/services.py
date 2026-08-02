import logging
from datetime import date, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from agreements.models import Agreement
from .models import RentPayment

logger = logging.getLogger(__name__)


def send_rent_due_reminder(agreement, payment_month=None):
    """Send an automated HTML email reminder to tenant with 1-click payment link."""
    tenant = agreement.tenant
    landlord = agreement.landlord
    property_obj = agreement.property

    if not payment_month:
        today = date.today()
        payment_month = date(today.getFullYear() if hasattr(today, 'getFullYear') else today.year, today.month, 1)

    formatted_month = payment_month.strftime("%B %Y")
    due_date_str = f"7th of {formatted_month}"

    # 1-Click Payment Link to Frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    payment_link = f"{frontend_url}/dashboard?agreement_id={agreement.id}&action=pay&month={payment_month.strftime('%Y-%m-%d')}"

    subject = f"⏰ Rent Payment Reminder: {property_obj.title} ({formatted_month})"
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0;">TenantPlus Nepal</h2>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Automated Lease & Payment Management</p>
        </div>

        <h3 style="margin-top: 0; color: #0f172a;">Rent Payment Reminder</h3>
        <p>Dear <strong>{tenant.full_name or tenant.email}</strong>,</p>
        <p>This is a friendly automated reminder that your monthly rent for <strong>{property_obj.title}</strong> is due on <strong>{due_date_str}</strong>.</p>

        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Property:</td>
              <td style="font-weight: bold; text-align: right;">{property_obj.title} ({property_obj.district})</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Billing Month:</td>
              <td style="font-weight: bold; text-align: right;">{formatted_month}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Rent Amount:</td>
              <td style="font-weight: bold; color: #4f46e5; font-size: 16px; text-align: right;">Rs. {float(agreement.rent_amount):,.2f}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Due Date:</td>
              <td style="font-weight: bold; color: #d97706; text-align: right;">{due_date_str}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="{payment_link}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 15px;">
            💳 1-Click Pay Rent via eSewa
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          🔒 <strong>Escrow Protected:</strong> Your payment will be safely processed via eSewa and logged under Nepalese House Rent Act 2075.
        </p>

        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          First Party (Landlord): {landlord.full_name or landlord.email} ({landlord.phone or 'N/A'})<br/>
          Support: inquire@tenantplus.com &bull; TenantPlus Inc.
        </div>
      </div>
    </body>
    </html>
    """

    plain_message = f"Rent Payment Reminder for {property_obj.title}: Rs. {agreement.rent_amount} due on {due_date_str}. Pay online: {payment_link}"

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@tenantplus.com'),
            recipient_list=[tenant.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Rent reminder email sent to {tenant.email} for agreement {agreement.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send rent reminder email to {tenant.email}: {e}")
        return False
