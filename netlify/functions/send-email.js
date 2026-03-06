const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function getBusinessRecipient() {
  return process.env.EMAIL_TO || 'hello@pmid.co.za';
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASS is missing in environment variables.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function getLogoPath() {
  const logoPath = path.resolve(__dirname, '../../assets/images/logo.png');
  return fs.existsSync(logoPath) ? logoPath : null;
}

function buildPdfBuffer(writeFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 44 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeFn(doc);
    doc.end();
  });
}

function drawBrandHeader(doc, title) {
  const logoPath = getLogoPath();
  doc.rect(0, 0, doc.page.width, 88).fill('#111827');
  doc.rect(0, 0, doc.page.width, 8).fill('#dc2626');

  if (logoPath) {
    doc.image(logoPath, 44, 24, { fit: [44, 44] });
  }

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('MIDSTAR', 96, 30);
  doc.font('Helvetica').fontSize(10).fillColor('#d1d5db').text('Pyramid Premium Streetwear', 96, 54);

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16).text(title, 44, 110);
}

async function buildQuotePdf({ quoteId, customerInfo, items, totalAmount }) {
  const safeItems = Array.isArray(items) ? items : [];
  const total = Number(totalAmount || 0);

  return buildPdfBuffer((doc) => {
    drawBrandHeader(doc, `Quote Request Summary #${quoteId}`);

    let y = 140;
    doc.font('Helvetica').fontSize(11).fillColor('#111827');
    doc.text(`Customer: ${customerInfo.name || 'N/A'}`, 44, y);
    doc.text(`Email: ${customerInfo.email || 'N/A'}`, 44, y + 16);
    doc.text(`Phone: ${customerInfo.phone || 'N/A'}`, 44, y + 32);
    doc.text(`Message: ${customerInfo.message || 'None'}`, 44, y + 48, { width: 520 });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 44, y + 78);

    y += 112;
    doc.rect(44, y, 523, 24).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
    doc.text('Item', 52, y + 7);
    doc.text('Size', 300, y + 7);
    doc.text('Qty', 360, y + 7);
    doc.text('Total', 430, y + 7);

    y += 32;
    doc.font('Helvetica').fontSize(10);

    safeItems.forEach((item) => {
      if (y > 730) {
        doc.addPage();
        drawBrandHeader(doc, `Quote Request Summary #${quoteId}`);
        y = 140;
      }

      const lineTotal = Number(item.total || 0).toFixed(2);
      doc.fillColor('#111827').text(String(item.name || 'Item'), 52, y, { width: 236 });
      doc.text(String(item.size || 'N/A'), 300, y, { width: 48 });
      doc.text(String(item.quantity || 0), 360, y, { width: 48 });
      doc.text(`R${lineTotal}`, 430, y, { width: 120, align: 'right' });
      y += 20;
    });

    y += 8;
    doc.moveTo(44, y).lineTo(567, y).strokeColor('#e5e7eb').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#dc2626').text(`Grand Total: R${total.toFixed(2)}`, 44, y, { width: 523, align: 'right' });
  });
}

async function buildContactPdf({ referenceId, formData }) {
  return buildPdfBuffer((doc) => {
    drawBrandHeader(doc, `Contact Enquiry #${referenceId}`);

    let y = 140;
    doc.font('Helvetica').fontSize(11).fillColor('#111827');
    doc.text(`Name: ${formData.firstName || ''} ${formData.lastName || ''}`, 44, y);
    doc.text(`Email: ${formData.email || 'N/A'}`, 44, y + 18);
    doc.text(`Phone: ${formData.phone || 'N/A'}`, 44, y + 36);
    doc.text(`Subject: ${formData.subject || 'General Inquiry'}`, 44, y + 54);
    doc.text(`Newsletter: ${formData.newsletter ? 'Yes' : 'No'}`, 44, y + 72);
    doc.text(`Submitted: ${new Date().toLocaleString()}`, 44, y + 90);

    y += 132;
    doc.rect(44, y, 523, 24).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text('Customer Message', 52, y + 7);
    y += 34;

    doc.font('Helvetica').fontSize(11).fillColor('#111827').text(formData.message || 'No message provided.', 52, y, {
      width: 507,
      align: 'left'
    });
  });
}

exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('📧 Email function started...');
    const data = JSON.parse(event.body);
    console.log('📧 Received data:', JSON.stringify(data));
    
    // Check if this is a QUOTE REQUEST
    if (data.type === 'quote' || data.items || data.customerInfo) {
      console.log('🛒 Processing QUOTE request...');
      const ci = data.customerInfo || {};
      const items = data.items || [];
      const total = data.totalAmount || items.reduce((s, i) => s + (i.total || 0), 0);
      const qid = ci.quoteId || 'PYRAMID-' + Date.now();
      const businessRecipient = getBusinessRecipient();
      
      if (!ci.email || !ci.name) {
        return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing email or name' }) };
      }
      
      const itemsHtml = items.map(i => '<div style="padding:10px 0;border-bottom:1px solid #eee"><strong>' + i.name + '</strong><br><span style="color:#666">Size: ' + i.size + ' | Qty: ' + i.quantity + '</span><br><strong style="color:#dc2626">R' + i.total.toFixed(2) + '</strong></div>').join('');
      
      const transporter = createTransporter();
      await transporter.verify();
      
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
      const minQuote = (total * 1.4).toFixed(2);
      const maxQuote = (total * 1.6).toFixed(2);
      const timestamp = new Date().toLocaleString();
      const quotePdf = await buildQuotePdf({
        quoteId: qid,
        customerInfo: ci,
        items,
        totalAmount: total
      });
      
      const cartItemsHtml = items.map(i => '<div class="cart-item"><div class="item-details"><div class="item-name">' + i.name + '</div><div class="item-specs">Size: ' + i.size + ' | Qty: ' + i.quantity + '</div></div><div class="item-price">R' + i.total.toFixed(2) + '</div></div>').join('');
      
      await transporter.sendMail({ 
        from: process.env.EMAIL_USER, 
        to: businessRecipient, 
        subject: '🛍️ New Quote Request - Midstar #' + qid + ' - ' + ci.name, 
        html: '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9fafb;color:#1f2937}.container{max-width:700px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;padding:40px 30px;text-align:center}.header h1{margin:0;font-size:32px;font-weight:700;letter-spacing:2px}.header p{margin:10px 0 0;font-size:16px;opacity:.9}.content{padding:40px 30px}.alert{background:linear-gradient(135deg,#fee2e2,#dbeafe);border-left:4px solid #dc2626;padding:20px;margin-bottom:30px;border-radius:8px}.alert h2{margin:0 0 10px;color:#dc2626;font-size:20px}.cart-summary{background:#f3f4f6;border-radius:12px;padding:25px;margin:25px 0}.cart-summary h3{margin:0 0 20px;color:#1f2937;font-size:20px;text-align:center}.cart-item{display:flex;justify-content:space-between;align-items:center;padding:15px;background:#fff;border-radius:8px;margin-bottom:10px;border:1px solid #e5e7eb}.item-details{flex:1}.item-name{font-weight:600;color:#1f2937;font-size:16px}.item-specs{color:#6b7280;font-size:14px;margin-top:5px}.item-price{font-weight:600;color:#dc2626;font-size:16px}.total-section{background:linear-gradient(135deg,#1f2937,#374151);color:#fff;border-radius:12px;padding:25px;margin:25px 0;text-align:center}.total-section h3{margin:0 0 15px;font-size:18px}.total-amount{font-size:32px;font-weight:700;color:#dc2626;margin:10px 0}.customer-info{background:#f9fafb;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #1d4ed8}.customer-info h3{margin:0 0 20px;color:#1d4ed8;font-size:18px}.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb}.info-label{font-weight:600;color:#374151}.info-value{color:#1f2937;font-weight:500}.priority-notice{background:linear-gradient(135deg,#fee2e2,#fef2f2);border:2px solid #dc2626;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.priority-notice strong{color:#dc2626;font-size:18px}.profit-margin{background:#d1fae5;border:2px solid #10b981;padding:15px;border-radius:8px;margin:15px 0}.profit-margin h4{margin:0 0 10px;color:#047857}.profit-calculation{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px}.footer{background:#1f2937;color:#fff;padding:30px;text-align:center}.footer h3{margin:0 0 15px;color:#dc2626}.footer p{margin:5px 0;opacity:.8}.timestamp{background:#e5e7eb;padding:10px 15px;border-radius:6px;font-size:14px;color:#6b7280;text-align:center;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1>Midstar</h1><p>New Quote Request Received</p></div><div class="content"><div class="alert"><h2>🛒 New Quote Request</h2><p>A customer has requested a quote. Review the order details below.</p></div><div class="cart-summary"><h3>🛍️ Requested Items</h3>' + cartItemsHtml + '</div><div class="total-section"><h3>💰 Order Value</h3><div class="total-amount">R' + total.toFixed(2) + '</div><p>Estimated retail value of requested items</p></div><div class="profit-margin"><h4>📊 Profit Analysis</h4><div class="profit-calculation"><div><strong>Retail Value:</strong> R' + total.toFixed(2) + '</div><div><strong>Suggested Margin:</strong> 40-60%</div><div><strong>Min Quote:</strong> R' + minQuote + '</div><div><strong>Max Quote:</strong> R' + maxQuote + '</div></div></div><div class="customer-info"><h3>👤 Customer Details</h3><div class="info-row"><span class="info-label">Name:</span><span class="info-value">' + ci.name + '</span></div><div class="info-row"><span class="info-label">Email:</span><span class="info-value">' + ci.email + '</span></div><div class="info-row"><span class="info-label">Phone:</span><span class="info-value">' + (ci.phone || 'N/A') + '</span></div><div class="info-row"><span class="info-label">Message:</span><span class="info-value">' + (ci.message || 'None') + '</span></div><div class="info-row"><span class="info-label">Quote ID:</span><span class="info-value">#' + qid + '</span></div><div class="info-row"><span class="info-label">Items Count:</span><span class="info-value">' + itemsCount + ' items</span></div></div><div class="priority-notice"><strong>⚡ URGENT ACTION REQUIRED</strong><br>Send quote within 24 hours to maintain customer interest<br><small>Quick response = Higher conversion rate</small></div><div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0"><h4 style="margin:0 0 15px;color:#1f2937">📋 Next Steps:</h4><ol style="margin:0;padding-left:20px;color:#374151"><li>Review customer cart items and quantities</li><li>Calculate competitive pricing (40-60% margin recommended)</li><li>Prepare quote email with Midstar branding</li><li>Include delivery timeline and payment terms</li><li>Send quote within 24 hours for best conversion</li></ol></div><div class="timestamp">Quote Requested: ' + timestamp + '</div></div><div class="footer"><h3>Pyramid (Midstar) Business Dashboard</h3><p>📍 Cape Town, South Africa</p><p>📧 hello@pmid.co.za</p><p>📱 071 000 0000</p><p style="margin-top:20px;font-size:12px;opacity:.6">This notification was generated automatically from your Midstar (Pyramid) website cart system.</p></div></div></body></html>',
        attachments: [
          {
            filename: `Midstar-Quote-${qid}.pdf`,
            content: quotePdf,
            contentType: 'application/pdf'
          }
        ]
      });
      
      await transporter.sendMail({ 
        from: process.env.EMAIL_USER, 
        to: ci.email, 
        subject: '✅ Quote Request Confirmed - Midstar #' + qid,
        html: '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9fafb;color:#1f2937}.container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;padding:40px 30px;text-align:center}.header h1{margin:0;font-size:32px;font-weight:700;letter-spacing:2px}.header p{margin:10px 0 0;font-size:16px;opacity:.9}.content{padding:40px 30px}.confirmation{text-align:center;background:linear-gradient(135deg,#d1fae5,#a7f3d0);padding:30px;border-radius:12px;margin-bottom:30px;border:2px solid #10b981}.confirmation h2{margin:0 0 15px;color:#047857;font-size:24px}.confirmation p{margin:0;font-size:16px;color:#374151}.quote-info{background:#f3f4f6;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #1d4ed8}.quote-info h3{margin:0 0 15px;color:#1d4ed8;font-size:18px}.cart-summary{background:#f9fafb;border-radius:12px;padding:25px;margin:25px 0}.cart-summary h3{margin:0 0 20px;color:#1f2937;font-size:18px;text-align:center}.cart-item{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:#fff;border-radius:8px;margin-bottom:10px;border:1px solid #e5e7eb}.item-details{flex:1}.item-name{font-weight:600;color:#1f2937;font-size:14px}.item-specs{color:#6b7280;font-size:12px;margin-top:3px}.item-price{font-weight:600;color:#dc2626;font-size:14px}.total-section{background:linear-gradient(135deg,#1f2937,#374151);color:#fff;border-radius:12px;padding:25px;margin:25px 0;text-align:center}.total-section h3{margin:0 0 15px;font-size:18px}.total-amount{font-size:28px;font-weight:700;color:#dc2626;margin:10px 0}.next-steps{background:linear-gradient(135deg,#fee2e2,#dbeafe);border-radius:12px;padding:25px;margin:25px 0}.next-steps h3{margin:0 0 15px;color:#dc2626;font-size:18px}.step{display:flex;align-items:flex-start;margin:15px 0}.step-number{background:#dc2626;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;margin-right:15px;flex-shrink:0}.step-content{flex:1;color:#374151}.business-info{background:#1f2937;color:#fff;border-radius:12px;padding:30px;margin:30px 0;text-align:center}.business-info h3{margin:0 0 20px;color:#dc2626;font-size:20px}.contact-detail{display:flex;align-items:center;justify-content:center;margin:10px 0;font-size:14px}.guarantee-badge{background:#d1fae5;border:2px solid #10b981;border-radius:12px;padding:20px;text-align:center;margin:20px 0}.guarantee-badge h4{margin:0 0 10px;color:#047857;font-size:16px}.guarantee-badge p{margin:0;color:#374151;font-size:14px}.reference-info{background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:15px;margin:15px 0;text-align:center}.reference-info strong{color:#dc2626;font-size:16px}.footer{background:#f3f4f6;padding:20px 30px;text-align:center;color:#6b7280;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>Midstar</h1><p>Style Redefined - Quote Request Confirmed</p></div><div class="content"><div class="confirmation"><h2>✅ Quote Request Received!</h2><p>Thank you for your interest in Midstar by Pyramid. We\'re preparing your personalized quote and will send it within 24 hours.</p></div><div class="quote-info"><h3>📋 Quote Details</h3><p><strong>Customer Name:</strong> ' + ci.name + '</p><p><strong>Customer Email:</strong> ' + ci.email + '</p><p><strong>Your Message:</strong> ' + (ci.message || 'No additional message') + '</p><p><strong>Reference Number:</strong> #' + qid + '</p><p><strong>Items Requested:</strong> ' + itemsCount + ' items</p><p><strong>Estimated Value:</strong> R' + total.toFixed(2) + '</p><p><strong>Quote Status:</strong> Processing</p><p><strong>Expected Response:</strong> Within 24 hours</p></div><div class="cart-summary"><h3>🛍️ Your Requested Items</h3>' + cartItemsHtml + '</div><div class="total-section"><h3>💰 Estimated Total</h3><div class="total-amount">R' + total.toFixed(2) + '</div><p><small>Final pricing will be provided in your personalized quote</small></p></div><div class="next-steps"><h3>📞 What Happens Next?</h3><div class="step"><div class="step-number">1</div><div class="step-content"><strong>Quote Preparation</strong><br>Our team reviews your items and prepares competitive pricing</div></div><div class="step"><div class="step-number">2</div><div class="step-content"><strong>Personalized Quote</strong><br>You\'ll receive a detailed quote via email within 24 hours</div></div><div class="step"><div class="step-number">3</div><div class="step-content"><strong>Order Confirmation</strong><br>Accept the quote and we\'ll begin processing your order</div></div><div class="step"><div class="step-number">4</div><div class="step-content"><strong>Fast Delivery</strong><br>Your premium Midstar items will be delivered within 3-5 days</div></div></div><div class="guarantee-badge"><h4>🛡️ Midstar Guarantee</h4><p>Premium quality • Fast delivery • 30-day returns • Excellent customer service</p></div><div class="reference-info"><strong>📞 Need to contact us about this quote?</strong><br>Reference: #' + qid + '</div><div class="business-info"><h3>📍 Contact Information</h3><div class="contact-detail"><span>🏢</span> Midstar by Pyramid - Premium Clothing Brand</div><div class="contact-detail"><span>📍</span> Cape Town, South Africa</div><div class="contact-detail"><span>📧</span> hello@pmid.co.za</div><div class="contact-detail"><span>📱</span> 071 000 0000</div><div class="contact-detail"><span>🕒</span> Mon-Fri: 9AM-5PM SAST</div></div></div><div class="footer"><p>This email was sent because you requested a quote from Midstar by Pyramid.</p><p>Pyramid (Midstar) © 2026 - Crafted with ❤️ in Cape Town, South Africa</p></div></div></body></html>',
        attachments: [
          {
            filename: `Midstar-Quote-${qid}.pdf`,
            content: quotePdf,
            contentType: 'application/pdf'
          }
        ]
      });
      
      console.log('✅ Quote emails sent');
      return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, message: 'Quote request sent!', quoteId: qid }) };
    }
    
    // CONTACT FORM handling
    console.log('📧 Processing contact form...');
    const formData = data.formData || data;
    const businessRecipient = getBusinessRecipient();
    const contactRef = `PYRAMID-CONTACT-${Date.now()}`;
    
    // Simple validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
      console.log('❌ Missing required fields');
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Please fill in all required fields: First Name, Last Name, Email, and Message' })
      };
    }

    // Create transporter
    console.log('📧 Creating transporter...');
    const transporter = createTransporter();
    await transporter.verify();
    const contactPdf = await buildContactPdf({
      referenceId: contactRef,
      formData
    });

    const submissionDate = new Date().toLocaleString();
    const newsletterStatus = formData.newsletter ? 'Yes - Subscribed' : 'No';

    // Send email to business
    console.log('📧 Sending business email...');
    const businessResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: businessRecipient,
      subject: '🔔 New Contact - Midstar - ' + formData.firstName + ' ' + formData.lastName,
      html: '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9fafb;color:#1f2937}.container{max-width:600px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;padding:40px 30px;text-align:center}.header h1{margin:0;font-size:32px;font-weight:700;letter-spacing:2px}.header p{margin:10px 0 0;font-size:16px;opacity:.9}.content{padding:40px 30px}.alert{background:linear-gradient(135deg,#fee2e2,#dbeafe);border-left:4px solid #dc2626;padding:20px;margin-bottom:30px;border-radius:8px}.alert h2{margin:0 0 10px;color:#dc2626;font-size:20px}.customer-details{background:#f3f4f6;border-radius:12px;padding:25px;margin:25px 0}.detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e5e7eb}.detail-row:last-child{border-bottom:none}.detail-label{font-weight:600;color:#374151;min-width:120px}.detail-value{color:#1f2937;font-weight:500;flex:1;text-align:right}.message-section{background:#f9fafb;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #1d4ed8}.message-section h3{margin:0 0 15px;color:#1d4ed8;font-size:18px}.message-content{line-height:1.6;color:#374151;background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb}.action-button{display:inline-block;background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:600;text-align:center;margin:20px 0;transition:transform .2s ease}.footer{background:#1f2937;color:#fff;padding:30px;text-align:center}.footer h3{margin:0 0 15px;color:#dc2626}.footer p{margin:5px 0;opacity:.8}.timestamp{background:#e5e7eb;padding:10px 15px;border-radius:6px;font-size:14px;color:#6b7280;text-align:center;margin:20px 0}.priority-high{background:linear-gradient(135deg,#fee2e2,#fef2f2);border:2px solid #dc2626;padding:15px;border-radius:8px;margin:20px 0;text-align:center}.priority-high strong{color:#dc2626;font-size:16px}</style></head><body><div class="container"><div class="header"><h1>Midstar</h1><p>Style Redefined - New Customer Inquiry</p></div><div class="content"><div class="alert"><h2>🔔 New Contact Form Submission</h2><p>A potential customer has reached out through your website contact form. Review the details below and respond within 24 hours.</p></div><div class="customer-details"><h3 style="margin:0 0 20px;color:#1f2937">Customer Information</h3><div class="detail-row"><span class="detail-label">Name:</span><span class="detail-value">' + formData.firstName + ' ' + formData.lastName + '</span></div><div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">' + formData.email + '</span></div><div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-value">' + (formData.phone || 'Not provided') + '</span></div><div class="detail-row"><span class="detail-label">Subject:</span><span class="detail-value">' + (formData.subject || 'General Inquiry') + '</span></div><div class="detail-row"><span class="detail-label">Newsletter:</span><span class="detail-value">' + newsletterStatus + '</span></div></div><div class="message-section"><h3>📝 Customer Message</h3><div class="message-content">' + formData.message + '</div></div><div class="priority-high"><strong>⚡ HIGH PRIORITY</strong><br>Respond within 24 hours to maintain excellent customer service</div><div style="text-align:center"><a href="mailto:' + formData.email + '" class="action-button">📧 Reply to Customer</a></div><div class="timestamp">Submitted: ' + submissionDate + '</div></div><div class="footer"><h3>Pyramid (Midstar) Business Dashboard</h3><p>📍 Cape Town, South Africa</p><p>📧 hello@pmid.co.za</p><p>📱 071 000 0000</p><p style="margin-top:20px;font-size:12px;opacity:.6">This notification was generated automatically from your Midstar (Pyramid) website contact form.</p></div></div></body></html>',
      attachments: [
        {
          filename: `Midstar-Contact-${contactRef}.pdf`,
          content: contactPdf,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('✅ Business email sent:', businessResult.messageId);

    // Send confirmation to customer
    const timestamp = new Date().toLocaleString();
    console.log('📧 Sending confirmation email...');
    const confirmationResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: formData.email,
      subject: 'Thank You for Contacting Midstar (Pyramid) - We\'ll Respond Within 24 Hours',
      html: '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9fafb;color:#1f2937}.container{max-width:650px;margin:0 auto;background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;padding:50px 30px;text-align:center}.header h1{margin:0;font-size:36px;font-weight:700;letter-spacing:3px}.header p{margin:15px 0 0;font-size:18px;opacity:.95}.content{padding:40px 30px}.thank-you{background:linear-gradient(135deg,#fee2e2,#dbeafe);border-radius:12px;padding:30px;margin-bottom:30px;text-align:center}.thank-you h2{margin:0 0 15px;color:#dc2626;font-size:26px}.thank-you p{margin:0;font-size:16px;color:#374151;line-height:1.6}.response-info{background:#f3f4f6;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #1d4ed8}.response-info h3{margin:0 0 15px;color:#1d4ed8;font-size:20px}.response-info p{margin:10px 0;color:#374151;line-height:1.6}.info-box{background:#fff;border:2px solid #e5e7eb;border-radius:12px;padding:25px;margin:25px 0}.info-box h3{margin:0 0 20px;color:#1f2937;font-size:18px;border-bottom:2px solid #dc2626;padding-bottom:10px}.contact-item{display:flex;align-items:center;margin:12px 0;padding:10px;background:#f9fafb;border-radius:6px}.contact-item strong{min-width:100px;color:#374151}.banking-details{background:linear-gradient(135deg,#f3f4f6,#e5e7eb);border-radius:12px;padding:25px;margin:25px 0}.banking-details h3{margin:0 0 20px;color:#1f2937;font-size:18px;text-align:center}.bank-item{margin:10px 0;padding:10px;background:#fff;border-radius:6px;display:flex;justify-content:space-between;align-items:center}.bank-label{font-weight:600;color:#374151}.bank-value{color:#1f2937;font-weight:500}.products{margin:30px 0}.products h3{text-align:center;color:#1f2937;font-size:22px;margin-bottom:25px}.product-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.product-card{background:#f9fafb;border-radius:8px;padding:15px;text-align:center;border:2px solid #e5e7eb;transition:transform .2s ease}.product-card h4{margin:10px 0;color:#dc2626;font-size:16px}.product-card p{margin:0;color:#6b7280;font-size:14px}.cta-button{display:inline-block;background:linear-gradient(135deg,#dc2626,#1d4ed8);color:#fff;text-decoration:none;padding:18px 40px;border-radius:10px;font-weight:700;text-align:center;margin:20px 0;transition:transform .2s ease;font-size:16px;box-shadow:0 4px 12px rgba(220,38,38,0.3)}.social-section{background:#f3f4f6;border-radius:12px;padding:25px;margin:30px 0;text-align:center}.social-section h3{margin:0 0 15px;color:#1f2937}.social-links{display:flex;justify-content:center;gap:20px;margin-top:15px}.social-link{display:inline-flex;align-items:center;justify-content:center;width:45px;height:45px;background:#fff;border-radius:50%;color:#dc2626;text-decoration:none;font-weight:700;border:2px solid #dc2626;transition:all .2s ease}.footer{background:#1f2937;color:#fff;padding:30px;text-align:center}.footer h3{margin:0 0 15px;color:#dc2626}.footer p{margin:8px 0;opacity:.85}.reference{background:#e5e7eb;padding:12px 20px;border-radius:8px;font-size:14px;color:#6b7280;text-align:center;margin:20px 0;border-left:4px solid #1d4ed8}</style></head><body><div class="container"><div class="header"><h1>Midstar</h1><p>Style Redefined - Premium Clothing</p></div><div class="content"><div class="thank-you"><h2>🎉 Thank You, ' + formData.firstName + '!</h2><p>We truly appreciate you reaching out to Midstar by Pyramid. Your inquiry is important to us, and our team is already reviewing your message.</p></div><div class="response-info"><h3>⏰ What Happens Next?</h3><p><strong>Response Time:</strong> Our team will respond to your inquiry within 24 hours during business days.</p><p><strong>Your Subject:</strong> ' + (formData.subject || 'General Inquiry') + '</p><p>We\'re committed to providing you with the best customer service experience. If your inquiry is urgent, please don\'t hesitate to call us directly.</p></div><div class="reference">Reference: ' + contactRef + ' | Submitted: ' + timestamp + '</div><div class="info-box"><h3>📞 Contact Information</h3><div class="contact-item"><strong>Email:</strong><span>hello@pmid.co.za</span></div><div class="contact-item"><strong>Phone:</strong><span>071 000 0000</span></div><div class="contact-item"><strong>Location:</strong><span>Cape Town, South Africa</span></div></div><div class="banking-details"><h3>💳 Banking Details (For Advance Payments)</h3><div class="bank-item"><span class="bank-label">Account Name:</span><span class="bank-value">Pyramid</span></div><div class="bank-item"><span class="bank-label">Bank:</span><span class="bank-value">FNB</span></div><div class="bank-item"><span class="bank-label">Account Type:</span><span class="bank-value">Business Cheque</span></div><p style="text-align:center;margin-top:15px;font-size:14px;color:#6b7280">Please use your order number as payment reference</p></div><div class="products"><h3>🔥 Featured Products</h3><div class="product-grid"><div class="product-card"><h4>Premium Tees</h4><p>Comfort meets style</p></div><div class="product-card"><h4>Designer Hoodies</h4><p>Stay warm in elegance</p></div><div class="product-card"><h4>Luxury Joggers</h4><p>Ultimate comfort wear</p></div><div class="product-card"><h4>Statement Caps</h4><p>Complete your look</p></div></div></div><div style="text-align:center;margin:30px 0"><a href="https://pmid.co.za" class="cta-button">🛍️ Browse Our Full Collection</a></div><div class="social-section"><h3>Follow Us on Social Media</h3><p>Stay updated with our latest collections, exclusive offers, and style inspiration!</p><div class="social-links"><a href="https://www.facebook.com/profile.php?id=61583557888022" target="_blank" class="social-link"></a><a href="#" class="social-link">📷</a><a href="#" class="social-link">𝕏</a></div></div></div><div class="footer"><h3>Midstar by Pyramid - Style Redefined</h3><p>📍 Cape Town, South Africa</p><p>📧 hello@pmid.co.za</p><p>📱 071 000 0000</p><p style="margin-top:25px;font-size:12px;opacity:.7">This is an automated confirmation email. Please do not reply directly to this message.</p><p style="font-size:12px;opacity:.7">For assistance, contact us at hello@pmid.co.za</p></div></div></body></html>',
      attachments: [
        {
          filename: `Midstar-Contact-${contactRef}.pdf`,
          content: contactPdf,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('✅ Confirmation email sent:', confirmationResult.messageId);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true,
        message: 'Thank you! Your message has been sent successfully. Check your email for confirmation.'
      })
    };

  } catch (error) {
    console.error('❌ Contact form error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Failed to send message: ' + error.message 
      })
    };
  }
};
