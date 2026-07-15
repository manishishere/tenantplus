import io
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter

def generate_agreement_pdf(agreement):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    Story = []

    Story.append(Paragraph("Tenancy Agreement", styles['Title']))
    Story.append(Spacer(1, 12))

    landlord_name = agreement.landlord.full_name or agreement.landlord.email
    tenant_name = agreement.tenant.full_name or agreement.tenant.email

    Story.append(Paragraph(f"<b>Landlord:</b> {landlord_name}", styles['Normal']))
    Story.append(Paragraph(f"<b>Tenant:</b> {tenant_name}", styles['Normal']))
    Story.append(Paragraph(f"<b>Property Address:</b> {agreement.property.address}", styles['Normal']))
    Story.append(Paragraph(f"<b>Rent Amount:</b> Rs. {agreement.rent_amount}", styles['Normal']))
    Story.append(Paragraph(f"<b>Start Date:</b> {agreement.start_date}", styles['Normal']))
    Story.append(Paragraph(f"<b>End Date:</b> {agreement.end_date}", styles['Normal']))
    Story.append(Spacer(1, 12))

    boilerplate = (
        "This agreement is made in accordance with the House Rent Act 2075. "
        "Both parties agree to the terms and conditions outlined herein. "
        "The tenant agrees to pay the stipulated rent amount on a monthly basis, "
        "and the landlord agrees to provide the property in a habitable condition."
    )
    Story.append(Paragraph(boilerplate, styles['Normal']))
    
    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_receipt_pdf(payment):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    Story = []

    Story.append(Paragraph("Rent Payment Receipt", styles['Title']))
    Story.append(Spacer(1, 12))

    tenant_name = payment.agreement.tenant.full_name or payment.agreement.tenant.email

    Story.append(Paragraph(f"<b>Receipt No:</b> {payment.receipt_no}", styles['Normal']))
    Story.append(Paragraph(f"<b>Tenant:</b> {tenant_name}", styles['Normal']))
    Story.append(Paragraph(f"<b>Property:</b> {payment.agreement.property.address}", styles['Normal']))
    Story.append(Paragraph(f"<b>Payment Month:</b> {payment.payment_month.strftime('%B %Y')}", styles['Normal']))
    Story.append(Paragraph(f"<b>Amount Paid:</b> Rs. {payment.amount}", styles['Normal']))
    Story.append(Paragraph(f"<b>Late Fee:</b> Rs. {payment.late_fee}", styles['Normal']))
    Story.append(Paragraph(f"<b>Total Paid:</b> Rs. {payment.amount + payment.late_fee}", styles['Normal']))
    Story.append(Paragraph(f"<b>Date Paid:</b> {payment.paid_at.strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    
    # Check for eSewa transaction ID
    esewa_log = payment.esewa_logs.filter(status='COMPLETE').first()
    if esewa_log and esewa_log.transaction_code:
        Story.append(Paragraph(f"<b>Transaction ID (eSewa):</b> {esewa_log.transaction_code}", styles['Normal']))

    Story.append(Spacer(1, 12))
    Story.append(Paragraph("Thank you for your payment.", styles['Normal']))
    
    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
