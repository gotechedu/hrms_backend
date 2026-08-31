const nodemailer = require('nodemailer');

/**
 * Configure Nodemailer Transporter
 * Falls back to test Ethereal account or mock mode if SMTP settings are not provided in .env
 */
const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to test ethereal email transport or direct logging
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.warn('[EmailService] SMTP credentials missing and failed to create Ethereal account. Emails will be logged to console.');
    return null;
  }
};

/**
 * Send Payment Confirmation & Official Tax Invoice Email
 */
const sendPaymentInvoiceEmail = async ({
  studentName,
  email,
  phone,
  courseTitle,
  feesAmount,
  paymentId,
  orderId,
  paidAt,
  batch,
}) => {
  try {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(feesAmount || 0);

    const formattedDate = paidAt ? new Date(paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN');
    const invoiceNo = `INV-GOTECH-${Math.floor(100000 + Math.random() * 900000)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt & Enrollment Confirmation - GoTechEdu</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; }
          .badge { display: inline-block; background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
          .body { padding: 32px 24px; }
          .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
          .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
          .invoice-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .row .label { color: #64748b; font-weight: 500; }
          .row .value { color: #0f172a; font-weight: 600; text-align: right; }
          .total-row { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 12px; font-size: 15px; font-weight: 800; }
          .total-row .value { color: #059669; font-size: 16px; }
          .btn-container { text-align: center; margin: 32px 0 16px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%); color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GoTechEdu Learning Hub</h1>
            <p>Official Student Enrollment & Tax Invoice</p>
            <span class="badge">Payment Verified ✓</span>
          </div>

          <div class="body">
            <div class="greeting">Dear ${studentName},</div>
            <p class="text">
              Thank you for enrolling in <strong>${courseTitle}</strong>! Your payment has been processed successfully. Below is your official tax invoice and enrollment confirmation details.
            </p>

            <div class="invoice-box">
              <div class="invoice-title">
                <span>Tax Invoice #${invoiceNo}</span>
                <span>${formattedDate.split(',')[0]}</span>
              </div>

              <div class="row">
                <span class="label">Student Name</span>
                <span class="value">${studentName}</span>
              </div>
              <div class="row">
                <span class="label">Enrolled Email</span>
                <span class="value">${email}</span>
              </div>
              <div class="row">
                <span class="label">Contact Phone</span>
                <span class="value">${phone || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Course Program</span>
                <span class="value">${courseTitle}</span>
              </div>
              <div class="row">
                <span class="label">Batch / Cohort</span>
                <span class="value">${batch || 'Current Cohort 2026'}</span>
              </div>
              <div class="row">
                <span class="label">Razorpay Payment ID</span>
                <span class="value" style="font-family: monospace; font-size: 11px;">${paymentId}</span>
              </div>
              <div class="row">
                <span class="label">Razorpay Order ID</span>
                <span class="value" style="font-family: monospace; font-size: 11px;">${orderId}</span>
              </div>

              <div class="row total-row">
                <span class="label">Total Amount Paid</span>
                <span class="value">${formattedAmount}</span>
              </div>
            </div>

            <p class="text" style="font-size: 13px;">
              You can now access your learning LMS portal and student dashboard to view course materials, upcoming live classes, and Discord community access.
            </p>

            <div class="btn-container">
              <a href="https://hrmsgotechedu.vercel.app/" class="btn" target="_blank">
                Access Student Portal →
              </a>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0;">GoTechEdu Official Academy & HRMS Portal</p>
            <p style="margin: 0; font-size: 11px; opacity: 0.8;">Need assistance? Reply directly to this email or contact support@gotechedu.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const transporter = await createTransporter();

    if (!transporter) {
      console.log(`\n=================================================`);
      console.log(`📧 [MOCK EMAIL INVOICE SENT TO ${email}]`);
      console.log(`Subject: Enrollment Invoice - ${courseTitle}`);
      console.log(`Amount: ${formattedAmount} | Payment ID: ${paymentId}`);
      console.log(`Link: https://hrmsgotechedu.vercel.app/`);
      console.log(`=================================================\n`);
      return { success: true, mock: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"GoTechEdu Admissions" <no-reply@gotechedu.com>',
      to: email,
      subject: `[Confirmed] Payment Receipt & Course Enrollment - ${courseTitle}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Invoice email successfully dispatched to ${email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Send Payment Invoice Email Error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendPaymentInvoiceEmail,
};
