import base64
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def num_to_words(amount):
    """Convert a numeric amount into English words representation."""
    try:
        val = int(amount)
        if val == 0:
            return "Zero Rupees"
        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        
        def convert(n):
            if n < 20:
                return units[n]
            if n < 100:
                return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")
            if n < 1000:
                return units[n // 100] + " Hundred" + (" " + convert(n % 100) if n % 100 != 0 else "")
            if n < 100000:
                return convert(n // 1000) + " Thousand" + (" " + convert(n % 1000) if n % 1000 != 0 else "")
            if n < 10000000:
                return convert(n // 100000) + " Lakh" + (" " + convert(n % 100000) if n % 100000 != 0 else "")
            return str(n)
        
        return convert(val) + " Rupees Only"
    except Exception:
        return f"{amount} Rupees"


def generate_agreement_pdf(agreement):
    """Generate official House Rent Agreement PDF matching standard Nepali legal template."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        spaceAfter=10
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        spaceAfter=5
    )

    Story = []

    # Document Header Title
    Story.append(Paragraph("<u>HOUSE RENT AGREEMENT</u>", title_style))
    Story.append(Spacer(1, 6))

    # Preamble Date
    created_date = agreement.created_at.strftime("%B %d, %Y") if hasattr(agreement.created_at, 'strftime') else datetime.now().strftime("%B %d, %Y")
    intro_text = (
        f"This House Rent Agreement (the \"Agreement\") is made and entered into on this <b>{created_date}</b>, "
        "by and between the following contracting parties:"
    )
    Story.append(Paragraph(intro_text, body_style))
    Story.append(Spacer(1, 4))

    # Party 1 & Party 2
    landlord_name = agreement.landlord.full_name or agreement.landlord.email
    landlord_email = agreement.landlord.email
    landlord_phone = agreement.landlord.phone or "9800000000"

    tenant_name = agreement.tenant.full_name or agreement.tenant.email
    tenant_email = agreement.tenant.email
    tenant_phone = agreement.tenant.phone or "9800000000"

    p1_text = (
        f"<b>1. FIRST PARTY (Landlord): {landlord_name}</b> (Email: {landlord_email}, Phone: {landlord_phone}), "
        "hereinafter referred to as the 'First Party' or 'Landlord'."
    )
    p2_text = (
        f"<b>2. SECOND PARTY (Tenant): {tenant_name}</b> (Email: {tenant_email}, Phone: {tenant_phone}), "
        "hereinafter referred to as the 'Second Party' or 'Tenant'."
    )
    Story.append(Paragraph(p1_text, body_style))
    Story.append(Paragraph(p2_text, body_style))
    Story.append(Spacer(1, 4))

    # WHEREAS Clause
    prop_address = agreement.property.address or f"{agreement.property.title}, {agreement.property.district}"
    whereas_text = (
        f"WHEREAS, the First Party is the legal owner of the rental property located at <b>{prop_address}</b>, "
        "and agrees to lease the premises to the Second Party, and the Second Party agrees to rent the same under "
        "the following binding terms and conditions:"
    )
    Story.append(Paragraph(whereas_text, body_style))
    Story.append(Spacer(1, 4))

    # Specific Terms 1 to 8
    start_str = agreement.start_date.strftime("%B %d, %Y") if hasattr(agreement.start_date, 'strftime') else str(agreement.start_date)
    end_str = agreement.end_date.strftime("%B %d, %Y") if hasattr(agreement.end_date, 'strftime') else str(agreement.end_date)
    
    rent_val = float(agreement.rent_amount)
    rent_words = num_to_words(rent_val)
    
    deposit_val = float(getattr(agreement, 'security_deposit', 0.0) or 0.0)
    deposit_words = num_to_words(deposit_val)

    c1 = f"<b>1. Tenancy Period:</b> This Agreement shall remain in full force and effect for a period starting from <b>{start_str}</b> to <b>{end_str}</b>, unless terminated earlier in accordance with the provisions herein."
    c2 = f"<b>2. Monthly Rent & Payment:</b> The monthly rent for the property is set at <b>Rs. {rent_val:,.2f} ({rent_words})</b>. The Second Party agrees to pay the stipulated rent to the First Party on a regular monthly basis."
    c3 = f"<b>3. Security Deposit:</b> The Second Party has paid an advance security deposit of <b>Rs. {deposit_val:,.2f} ({deposit_words})</b> to the First Party. This deposit is held as security for any unpaid rent, utility charges, or physical damage to the property beyond normal wear and tear, and shall be fully refunded or adjusted upon the peaceful handover of the premises upon lease expiration."
    c4 = "<b>4. Rent Escalation:</b> Upon completion or renewal of the contract, the rent amount shall be subject to a periodic escalation of 10% (or as mutually agreed by both parties in writing)."
    c5 = "<b>5. Notice Period for Termination:</b> If either party intends to terminate or not renew this Agreement upon its expiry, an advance written notice of at least <b>35 days</b> must be served to the other party."
    c6 = "<b>6. Utilities & Services:</b> All recurring expenses including water, electricity, trash disposal, internet, and any other utilities consumed by the Second Party on the premises shall be borne and paid directly by the Second Party."
    c7 = "<b>7. Prohibited & Illegal Activities:</b> The leased premises shall be utilized strictly for lawful residential purposes. The Second Party must not engage in, permit, or tolerate any illegal, hazardous, or nuisance activities within the property compound. Any violation of this clause shall grant the First Party the right to immediately expel the Tenant."
    c8 = "<b>8. Property Maintenance:</b> The Second Party is responsible for maintaining the interior of the premises in a clean, hygienic, and habitable condition. Any physical damage or loss to the structure, fittings, or fixtures caused by the negligence or willful act of the Second Party shall be repaired or financially compensated by the Second Party."

    clauses = [c1, c2, c3, c4, c5, c6, c7, c8]
    for c in clauses:
        Story.append(Paragraph(c, body_style))
        Story.append(Spacer(1, 2))

    # Page 2: Formal Signatures & Witness Section
    Story.append(PageBreak())
    Story.append(Spacer(1, 15))

    l_sig_url = getattr(agreement, 'landlord_signature_url', '') or ''
    t_sig_url = getattr(agreement, 'tenant_signature_url', '') or ''
    shared_sig_url = getattr(agreement, 'signed_document_url', '') or ''

    is_active_or_ack = getattr(agreement, 'status', '') == 'active' or getattr(agreement, 'signed_doc_status', '') == 'acknowledged'
    
    is_l_ack = getattr(agreement, 'landlord_acknowledged', False) or is_active_or_ack
    is_t_ack = getattr(agreement, 'tenant_acknowledged', False) or is_active_or_ack

    # 1. First Party (Landlord) Signature Cell
    l_status_text = "<font color='#10b981'><b>✅ SIGNED & APPROVED</b></font>" if is_l_ack else "<font color='#dc2626'>⏳ Pending Signature</font>"
    l_sig_html = f"<b>First Party (Landlord):</b><br/>Name: {landlord_name}<br/>Status: {l_status_text}"
    l_sig_cell = [Paragraph(l_sig_html, body_style)]
    
    target_l_url = l_sig_url if (l_sig_url and l_sig_url.startswith('data:image')) else (shared_sig_url if (shared_sig_url and shared_sig_url.startswith('data:image')) else '')
    
    if is_l_ack and target_l_url and target_l_url.startswith('data:image'):
        try:
            header, encoded = target_l_url.split(',', 1)
            data = base64.b64decode(encoded)
            img_buf = io.BytesIO(data)
            l_sig_cell.append(Spacer(1, 6))
            l_sig_cell.append(Image(img_buf, width=130, height=45))
        except Exception as e:
            print("PDF landlord signature render error:", e)

    # 2. Second Party (Tenant) Signature Cell
    t_status_text = "<font color='#10b981'><b>✅ SIGNED & APPROVED</b></font>" if is_t_ack else "<font color='#dc2626'>⏳ Pending Signature</font>"
    t_sig_html = f"<b>Second Party (Tenant):</b><br/>Name: {tenant_name}<br/>Status: {t_status_text}"
    t_sig_cell = [Paragraph(t_sig_html, body_style)]
    
    target_t_url = t_sig_url if (t_sig_url and t_sig_url.startswith('data:image')) else (shared_sig_url if (shared_sig_url and shared_sig_url.startswith('data:image')) else '')
    
    if is_t_ack and target_t_url and target_t_url.startswith('data:image'):
        try:
            header, encoded = target_t_url.split(',', 1)
            data = base64.b64decode(encoded)
            img_buf = io.BytesIO(data)
            t_sig_cell.append(Spacer(1, 6))
            t_sig_cell.append(Image(img_buf, width=130, height=45))
        except Exception as e:
            print("PDF tenant signature render error:", e)

    # Witness 1 & Witness 2 Section (Dynamic Legal Verification)
    w1_name = getattr(agreement, 'witness1_name', '') or ''
    w1_cit = getattr(agreement, 'witness1_citizenship', '') or ''
    w2_name = getattr(agreement, 'witness2_name', '') or ''
    w2_cit = getattr(agreement, 'witness2_citizenship', '') or ''

    if w1_name:
        w1_html = f"<b>Witness 1:</b><br/>Name: <b>{w1_name}</b><br/>Citizenship No: <b>{w1_cit or 'N/A'}</b><br/>Status: <font color='#10b981'><b>✅ WITNESS VERIFIED</b></font>"
    else:
        w1_html = "<b>Witness 1:</b><br/><br/>Name: __________________________<br/><br/>Signature: _______________________"

    if w2_name:
        w2_html = f"<b>Witness 2:</b><br/>Name: <b>{w2_name}</b><br/>Citizenship No: <b>{w2_cit or 'N/A'}</b><br/>Status: <font color='#10b981'><b>✅ WITNESS VERIFIED</b></font>"
    else:
        w2_html = "<b>Witness 2:</b><br/><br/>Name: __________________________<br/><br/>Signature: _______________________"

    sig_data = [
        [l_sig_cell, t_sig_cell],
        [Spacer(1, 25), Spacer(1, 25)],
        [
            Paragraph(w1_html, body_style),
            Paragraph(w2_html, body_style)
        ]
    ]

    sig_table = Table(sig_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    Story.append(sig_table)

    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def generate_utility_bill_pdf(bill):
    """Generate Utility Bill PDF matching official TenantPlus billing template."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'TopHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.white
    )

    logo_style = ParagraphStyle(
        'LogoBox',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.white
    )

    title_style = ParagraphStyle(
        'BillTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=15,
        spaceBefore=15
    )

    body_style = ParagraphStyle(
        'BillBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14
    )

    Story = []

    # 1. Dark Header Banner (Navy container)
    banner_left = Paragraph("inquire@tenantplus.com<br/>Kathmandu, Nepal<br/>+977-1-4444444<br/>tenantplus.com", header_style)
    banner_right = Paragraph("<br/><b>YOUR<br/>LOGO</b>", logo_style)

    header_table = Table([[banner_left, banner_right]], colWidths=[380, 150])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2b3046')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 15),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
    ]))
    Story.append(header_table)
    Story.append(Spacer(1, 15))

    # 2. Main Title
    Story.append(Paragraph("Utility Bill", title_style))
    Story.append(Spacer(1, 10))

    # 3. Company & Bill To Metadata
    agreement = bill.agreement
    tenant = agreement.tenant
    tenant_name = tenant.full_name or tenant.email
    tenant_email = tenant.email
    tenant_phone = tenant.phone or "9800000000"
    prop_address = agreement.property.address or f"{agreement.property.title}, {agreement.property.district}"

    inv_date = bill.created_at.strftime("%B %d, %Y") if hasattr(bill.created_at, 'strftime') else datetime.now().strftime("%B %d, %Y")
    due_date = bill.due_date.strftime("%B %d, %Y") if hasattr(bill.due_date, 'strftime') else str(bill.due_date)

    meta_text = (
        "<b>TenantPlus Inc.</b><br/>"
        "<b>Kathmandu, Nepal</b><br/><br/>"
        "<b>Bill To:</b><br/>"
        f"<b>{tenant_name}</b><br/>"
        f"<b>Address:</b> {prop_address}<br/>"
        f"<b>Email:</b> {tenant_email}<br/>"
        f"<b>Phone:</b> {tenant_phone}<br/><br/>"
        f"<b>Invoice Date:</b> {inv_date}<br/>"
        f"<b>Due Date:</b> {due_date}"
    )
    Story.append(Paragraph(meta_text, body_style))
    Story.append(Spacer(1, 15))

    # 4. Itemized Charges Table
    total_val = float(bill.total_amount)
    
    table_data = [
        [
            Paragraph("<b>Service Type</b>", body_style),
            Paragraph("<b>Usage</b>", body_style),
            Paragraph("<b>Rate (Rs.)</b>", body_style),
            Paragraph("<b>Amount Due (Rs.)</b>", body_style)
        ],
        [
            Paragraph("General Utility Fee", body_style),
            Paragraph("1 month", body_style),
            Paragraph(f"{total_val:,.2f}", body_style),
            Paragraph(f"{total_val:,.2f}", body_style)
        ]
    ]

    item_table = Table(table_data, colWidths=[160, 110, 130, 130])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    Story.append(item_table)
    Story.append(Spacer(1, 15))

    # 5. Total Amount Due
    total_text = f"<b>Total Amount Due: Rs. {total_val:,.2f}</b>"
    total_style = ParagraphStyle('TotalStyle', parent=body_style, fontName='Helvetica-Bold', fontSize=12, leading=16)
    Story.append(Paragraph(total_text, total_style))
    Story.append(Spacer(1, 20))

    # 6. Footer disclaimer
    footer_text = "Please make payment by the due date to avoid late fees. For questions, contact us at <b>support@tenantplus.com</b> or <b>+977-1-4444444</b>."
    footer_style = ParagraphStyle('FooterStyle', parent=body_style, fontSize=9, leading=13, textColor=colors.HexColor('#64748b'))
    Story.append(Paragraph(footer_text, footer_style))

    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def generate_receipt_pdf(payment):
    """Generate Rent Payment Receipt PDF matching official corporate template layout."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'TopHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.white
    )

    logo_style = ParagraphStyle(
        'LogoBox',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.white
    )

    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=15,
        spaceBefore=15
    )

    body_style = ParagraphStyle(
        'ReceiptBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14
    )

    Story = []

    # 1. Dark Header Banner (Navy container matching exact reference image)
    banner_left = Paragraph("inquire@tenantplus.com<br/>Kathmandu, Nepal<br/>+977-1-4444444<br/>tenantplus.com", header_style)
    banner_right = Paragraph("<br/><b>YOUR<br/>LOGO</b>", logo_style)

    header_table = Table([[banner_left, banner_right]], colWidths=[380, 150])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2b3046')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 15),
    ]))
    Story.append(header_table)
    Story.append(Spacer(1, 10))

    # 2. Main Title: Rent Payment Receipt
    Story.append(Paragraph("Rent Payment Receipt", title_style))
    Story.append(Spacer(1, 10))

    # 3. Metadata Details
    agreement = payment.agreement
    tenant = agreement.tenant
    tenant_name = tenant.full_name or tenant.email
    tenant_email = tenant.email
    tenant_phone = tenant.phone or "9800000000"
    prop_address = agreement.property.address or f"{agreement.property.title}, {agreement.property.district}"

    pay_date = payment.paid_at.strftime("%B %d, %Y") if hasattr(payment.paid_at, 'strftime') and payment.paid_at else datetime.now().strftime("%B %d, %Y")
    payment_month = payment.payment_month.strftime("%B %Y") if hasattr(payment.payment_month, 'strftime') else str(payment.payment_month)
    receipt_no = payment.receipt_no or str(payment.id)[:8].upper()

    meta_text = (
        "<b>TenantPlus Inc.</b><br/>"
        "<b>Kathmandu, Nepal</b><br/><br/>"
        "<b>Bill To:</b><br/>"
        f"<b>{tenant_name}</b><br/>"
        f"<b>Address:</b> {prop_address}<br/>"
        f"<b>Email:</b> {tenant_email}<br/>"
        f"<b>Phone:</b> {tenant_phone}<br/><br/>"
        f"<b>Receipt No:</b> {receipt_no}<br/>"
        f"<b>Payment Date:</b> {pay_date}<br/>"
        f"<b>Billing Period:</b> {payment_month}"
    )
    Story.append(Paragraph(meta_text, body_style))
    Story.append(Spacer(1, 15))

    # 4. Itemized Charges Table with Total Breakdown
    rent_amount = float(payment.amount)
    late_fee = float(payment.late_fee or 0.0)
    total_paid = rent_amount + late_fee
    
    table_data = [
        [
            Paragraph("<b>Service Type</b>", body_style),
            Paragraph("<b>Usage / Period</b>", body_style),
            Paragraph("<b>Rate (Rs.)</b>", body_style),
            Paragraph("<b>Amount Paid (Rs.)</b>", body_style)
        ],
        [
            Paragraph(f"Monthly Rent - {agreement.property.title}", body_style),
            Paragraph(payment_month, body_style),
            Paragraph(f"{rent_amount:,.2f}", body_style),
            Paragraph(f"{rent_amount:,.2f}", body_style)
        ]
    ]

    if late_fee > 0:
        table_data.append([
            Paragraph("Late Payment Administration Fee", body_style),
            Paragraph("1 penalty", body_style),
            Paragraph(f"{late_fee:,.2f}", body_style),
            Paragraph(f"{late_fee:,.2f}", body_style)
        ])

    item_table = Table(table_data, colWidths=[160, 110, 130, 130])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    Story.append(item_table)
    Story.append(Spacer(1, 15))

    # 5. Total Amount Paid Callout
    total_text = f"<b>Total Amount Paid: Rs. {total_paid:,.2f}</b>"
    total_style = ParagraphStyle('TotalStyle', parent=body_style, fontName='Helvetica-Bold', fontSize=12, leading=16)
    Story.append(Paragraph(total_text, total_style))
    Story.append(Spacer(1, 20))

    # 6. Transaction & Escrow Verification Details
    esewa_log = payment.esewa_logs.filter(status='COMPLETE').first()
    txn_code = esewa_log.transaction_code if esewa_log and esewa_log.transaction_code else "ONLINE-ESEWA-VERIFIED"
    
    txn_text = f"<b>Payment Method:</b> eSewa Nepal Digital Escrow Gateway &bull; <b>Txn Reference ID:</b> {txn_code}"
    Story.append(Paragraph(txn_text, body_style))
    Story.append(Spacer(1, 15))

    # 7. Footer disclaimer
    footer_text = "Thank you for your payment. For questions, contact us at <b>support@tenantplus.com</b> or <b>+977-1-4444444</b>."
    footer_style = ParagraphStyle('FooterStyle', parent=body_style, fontSize=9, leading=13, textColor=colors.HexColor('#64748b'))
    Story.append(Paragraph(footer_text, footer_style))

    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
