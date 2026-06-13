const PDFDocument = require('pdfkit');

function generateInvoicePdf(order, settings, invoiceNumber, res) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // Colors
  const primaryColor = '#1A1A1A';
  const accentColor = '#C9A84C'; // Gold
  const grayColor = '#777777';

  // Format Date
  const dateStr = new Date(order.createdAt).toLocaleDateString();

  // Draw Header
  doc
    .fillColor(primaryColor)
    .fontSize(28)
    .font('Helvetica-Bold')
    .text(settings?.siteName || 'Jannat Rugs Co.', 50, 50);

  doc
    .fontSize(10)
    .fillColor(grayColor)
    .font('Helvetica')
    .text(settings?.address || 'India', 50, 85, { width: 200 })
    .text(settings?.phone1 || '', 50, 115)
    .text(settings?.email || 'support@jannatrugs.com', 50, 130);

  // Invoice Details right aligned
  doc
    .fillColor(accentColor)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('INVOICE', 400, 50, { align: 'right' });

  doc
    .fillColor(primaryColor)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Invoice Number:', 400, 85, { align: 'right' })
    .font('Helvetica')
    .text(invoiceNumber, 400, 100, { align: 'right' })
    .font('Helvetica-Bold')
    .text('Date:', 400, 115, { align: 'right' })
    .font('Helvetica')
    .text(dateStr, 400, 130, { align: 'right' });

  // Divider
  doc.moveTo(50, 160).lineTo(550, 160).strokeColor(accentColor).lineWidth(2).stroke();

  // Bill To
  doc
    .fillColor(primaryColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Bill To', 50, 180);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(order.shippingAddress.name || 'Customer', 50, 205)
    .font('Helvetica')
    .fillColor(grayColor)
    .text(order.shippingAddress.phone || '', 50, 220)
    .text(order.shippingAddress.street || '', 50, 235)
    .text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.pincode || ''}`, 50, 250)
    .text(order.shippingAddress.country || '', 50, 265);

  // Payment Info
  doc
    .fillColor(primaryColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Payment Info', 400, 180, { align: 'right' });
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(grayColor)
    .text(`Method: ${order.paymentMethod}`, 400, 205, { align: 'right' })
    .text(`Status: ${order.isPaid ? 'Paid' : 'Pending'}`, 400, 220, { align: 'right' });

  // Items Table
  const tableTop = 320;
  
  // Table Header
  doc
    .fillColor(accentColor)
    .rect(50, tableTop, 500, 30)
    .fill();
    
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Item', 60, tableTop + 10)
    .text('Unit Price', 280, tableTop + 10, { width: 90, align: 'right' })
    .text('Quantity', 370, tableTop + 10, { width: 90, align: 'right' })
    .text('Amount', 460, tableTop + 10, { width: 80, align: 'right' });

  // Table Rows
  let y = tableTop + 40;
  doc.fillColor(primaryColor).font('Helvetica');

  (order.orderItems || []).forEach(item => {
    // Basic text wrap for long names
    const itemHeight = Math.max(15, doc.heightOfString(item.name, { width: 220 }));
    
    doc
      .text(item.name, 60, y, { width: 220 })
      .text(`Rs ${(item.price || 0).toLocaleString()}`, 280, y, { width: 90, align: 'right' })
      .text((item.quantity || 1).toString(), 370, y, { width: 90, align: 'right' })
      .text(`Rs ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}`, 460, y, { width: 80, align: 'right' });
    y += itemHeight + 10;
  });

  // Table Footer / Totals
  doc.moveTo(50, y).lineTo(550, y).strokeColor(grayColor).lineWidth(0.5).stroke();
  y += 15;

  doc
    .font('Helvetica-Bold')
    .text('Subtotal:', 350, y, { width: 100, align: 'right' })
    .font('Helvetica')
    .text(`Rs ${(order.itemsPrice || 0).toLocaleString()}`, 460, y, { width: 80, align: 'right' });
  y += 20;

  doc
    .font('Helvetica-Bold')
    .text('Shipping:', 350, y, { width: 100, align: 'right' })
    .font('Helvetica')
    .text(`Rs ${(order.shippingPrice || 0).toLocaleString()}`, 460, y, { width: 80, align: 'right' });
  y += 20;

  doc
    .font('Helvetica-Bold')
    .text('Tax / GST:', 350, y, { width: 100, align: 'right' })
    .font('Helvetica')
    .text(`Rs ${(order.taxPrice || 0).toLocaleString()}`, 460, y, { width: 80, align: 'right' });
  y += 20;

  // Final Total
  doc
    .fillColor(accentColor)
    .rect(340, y, 210, 30)
    .fill();
    
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Total:', 350, y + 9, { width: 100, align: 'right' })
    .text(`Rs ${(order.totalPrice || 0).toLocaleString()}`, 460, y + 9, { width: 80, align: 'right' });

  // Footer text
  doc
    .fontSize(10)
    .fillColor(grayColor)
    .font('Helvetica-Oblique')
    .text('Thank you for shopping with Jannat Rugs Co.', 50, 700, { align: 'center' });

  doc.end();
}

module.exports = generateInvoicePdf;
