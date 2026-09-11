const nodemailer = require("nodemailer");

/**
 * Send Transactional Email via Brevo REST API (formerly Sendinblue)
 * Falls back to Nodemailer SMTP or console logger if Brevo API key is not configured or fails.
 */
const sendEmailViaBrevo = async ({ to, name, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderName = process.env.BREVO_SENDER_NAME || "GoTechEdu";
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL || "no-reply@gotechedu.com";

  const isRealApiKey =
    apiKey && apiKey.trim() !== "" && !apiKey.includes("xxxxxxxx");

  if (isRealApiKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: to,
              name: name || to.split("@")[0],
            },
          ],
          subject,
          htmlContent,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(
          `📧 [Brevo Mail API] Email successfully delivered to ${to} (MessageId: ${data.messageId})`,
        );
        return { success: true, messageId: data.messageId, provider: "brevo" };
      } else {
        console.warn(
          `⚠️ [Brevo Mail API] Brevo returned status ${response.status}:`,
          data.message || data,
        );
      }
    } catch (apiErr) {
      console.error(
        "⚠️ [Brevo Mail API] Network or fetch error:",
        apiErr.message,
      );
    }
  } else {
    console.warn(
      `ℹ️ [Brevo Mail API] Valid BREVO_API_KEY not configured in .env (Found placeholder or empty).`,
    );
  }

  // Fallback 1: Nodemailer SMTP if configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        html: htmlContent,
      });

      console.log(
        `📧 [Nodemailer SMTP] Email delivered to ${to} (MessageId: ${info.messageId})`,
      );
      return {
        success: true,
        messageId: info.messageId,
        provider: "nodemailer",
      };
    } catch (smtpErr) {
      console.error(
        "⚠️ [Nodemailer SMTP] Failed fallback dispatch:",
        smtpErr.message,
      );
    }
  }

  // Fallback 2: Development / Mock console logger
  console.log(`\n=================================================`);
  console.log(`📧 [EMAIL NOTIFICATION LOG - RECIPIENT: ${to}]`);
  console.log(`Subject: ${subject}`);
  console.log(`Sender: ${senderName} <${senderEmail}>`);
  console.log(`Status: Ready for Brevo delivery once valid API key is set.`);
  console.log(`=================================================\n`);

  return { success: true, mock: true, provider: "console_mock" };
};

/**
 * 1. Employee Welcome Email with Temporary Credentials & Portal Login URL
 */
const sendEmployeeWelcomeEmail = async ({
  name,
  email,
  role = "employee",
  designation = "Team Member",
  department = "Engineering",
  temporaryPassword,
  portalUrl,
}) => {
  try {
    const resolvedPortalUrl = (
      portalUrl ||
      process.env.PORTAL_URL ||
      "https://portal.gotechedu.com"
    ).replace(/\/+$/, "");
    const subject = `Welcome to GoTechEdu! Your Employee Portal Credentials`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to GoTechEdu</title>
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #1e293b; }
          .wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; color: #93c5fd; }
          .badge { display: inline-block; background: #2563eb; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 14px; letter-spacing: 0.5px; }
          .content { padding: 36px 32px; background: #ffffff; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .lead { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
          .details-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 14px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .row .label { color: #64748b; font-weight: 600; }
          .row .value { color: #0f172a; font-weight: 700; }
          .cred-box { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 14px; padding: 22px; margin: 24px 0; }
          .cred-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e40af; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
          .cred-item { margin-bottom: 8px; font-size: 14px; }
          .cred-label { color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 2px; }
          .cred-value { font-family: 'Consolas', 'Courier New', monospace; font-size: 15px; font-weight: 700; color: #1e3a8a; background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid #dbeafe; display: inline-block; word-break: break-all; }
          .btn-wrap { text-align: center; margin: 32px 0 20px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37,99,235,0.35); }
          .notice { font-size: 12px; color: #dc2626; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px; margin-top: 24px; line-height: 1.5; }
          .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>GoTechEdu Portal</h1>
            <p>Enterprise Human Resource & Workforce Intelligence</p>
            <span class="badge">Employee Onboarding</span>
          </div>

          <div class="content">
            <div class="greeting">Welcome to the Team, ${name}!</div>
            <p class="lead">
              Your official employee account on the <strong>GoTechEdu Portal</strong> has been created. Below are your organization details and initial credentials to access the workstation dashboard.
            </p>

            <div class="details-card">
              <div class="details-title">Official Position Details</div>
              <div class="row">
                <span class="label">Department:</span>
                <span class="value">${department}</span>
              </div>
              <div class="row">
                <span class="label">Designation:</span>
                <span class="value">${designation}</span>
              </div>
              <div class="row">
                <span class="label">Assigned Role:</span>
                <span class="value" style="text-transform: capitalize;">${role}</span>
              </div>
            </div>

            <div class="cred-box">
              <div class="cred-title">🔒 Workstation Login Credentials</div>
              <div class="cred-item">
                <span class="cred-label">Portal Gateway URL</span>
                <span class="cred-value">${resolvedPortalUrl}</span>
              </div>
              <div class="cred-item">
                <span class="cred-label">Work Email Address</span>
                <span class="cred-value">${email}</span>
              </div>
              <div class="cred-item">
                <span class="cred-label">Default Temporary Password</span>
                <span class="cred-value">${temporaryPassword}</span>
              </div>
            </div>

            <div class="btn-wrap">
              <a href="${resolvedPortalUrl}" class="btn" target="_blank">
                Sign In to Portal Workstation →
              </a>
            </div>

            <div class="notice">
              <strong>Security Protocol Notice:</strong> This is a temporary access credential generated during your onboarding. For information security compliance, please sign in to the portal and update your password immediately.
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0;"><strong>GoTechEdu Organization</strong> • Gurugram, Haryana, India</p>
            <p style="margin: 0; font-size: 11px;">If you have any questions or require assistance, please contact your People Operations lead or email <a href="mailto:support@gotechedu.com" style="color: #2563eb;">support@gotechedu.com</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailViaBrevo({
      to: email,
      name,
      subject,
      htmlContent,
    });
  } catch (err) {
    console.error("sendEmployeeWelcomeEmail Error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * 2. Password Reset OTP Email
 */
const sendPasswordResetOtpEmail = async ({
  name = "Team Member",
  email,
  otp,
  portalUrl,
  expiresInMinutes = 15,
}) => {
  try {
    const resolvedPortalUrl = (
      portalUrl ||
      process.env.PORTAL_URL ||
      "https://portal.gotechedu.com"
    ).replace(/\/+$/, "");
    const subject = `[GoTechEdu Portal] Password Reset Verification Code: ${otp}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #1e293b; }
          .wrapper { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; border-bottom: 3px solid #2563eb; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 36px 28px; background: #ffffff; }
          .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .otp-container { background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }
          .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
          .otp-code { font-family: 'Consolas', 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; margin: 8px 0; }
          .otp-expiry { font-size: 12px; color: #ef4444; font-weight: 600; }
          .btn-wrap { text-align: center; margin: 28px 0 16px 0; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; }
          .security-note { font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.5; }
          .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>GoTechEdu Portal</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Security & Password Management</p>
          </div>

          <div class="content">
            <div class="greeting">Hello ${name},</div>
            <p class="text">
              We received a request to reset the password associated with your GoTechEdu Portal account (<strong>${email}</strong>). Use the 6-digit verification code below to complete your password update.
            </p>

            <div class="otp-container">
              <div class="otp-label">Verification OTP Code</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">Expires in ${expiresInMinutes} minutes</div>
            </div>

            <div class="btn-wrap">
              <a href="${resolvedPortalUrl}/auth/forgot-password" class="btn" target="_blank">
                Complete Password Reset →
              </a>
            </div>

            <div class="security-note">
              <strong>Didn't request this change?</strong> If you did not initiate this password reset, your password has not been changed. You can safely ignore this email or contact <a href="mailto:security@gotechedu.com" style="color: #2563eb;">security@gotechedu.com</a> immediately.
            </div>
          </div>

          <div class="footer">
            &copy; 2026 GoTechEdu Portal. All rights reserved. Automated security notification.
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailViaBrevo({
      to: email,
      name,
      subject,
      htmlContent,
    });
  } catch (err) {
    console.error("sendPasswordResetOtpEmail Error:", err);
    return { success: false, error: err.message };
  }
};

/**
 * 3. Payment Confirmation & Official Tax Invoice Email
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
  portalUrl,
}) => {
  try {
    const resolvedPortalUrl = (
      portalUrl ||
      process.env.PORTAL_URL ||
      "https://portal.gotechedu.com"
    ).replace(/\/+$/, "");
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(feesAmount || 0);

    const formattedDate = paidAt
      ? new Date(paidAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : new Date().toLocaleString("en-IN");
    const invoiceNo = `INV-GOTECH-${Math.floor(100000 + Math.random() * 900000)}`;
    const subject = `[Confirmed] Payment Receipt & Course Enrollment - ${courseTitle}`;

    // Itemized GST breakdown (18% GST inclusive standard)
    const baseFeeNumber = Math.round(Number(feesAmount || 0) / 1.18);
    const gstNumber = Number(feesAmount || 0) - baseFeeNumber;
    const formattedBaseFee = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(baseFeeNumber);
    const formattedGst = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(gstNumber);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Receipt & Enrollment Invoice - GoTechEdu</title>
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 15px 35px rgba(0,0,0,0.15); }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; color: #e0f2fe; }
          .badge { display: inline-block; background: #10b981; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
          .body { padding: 32px 28px; }
          .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
          .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; margin-bottom: 24px; }
          .invoice-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .row .label { color: #64748b; font-weight: 500; }
          .row .value { color: #0f172a; font-weight: 600; text-align: right; }
          .divider { border-top: 1px solid #e2e8f0; margin: 12px 0; }
          .total-row { border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 12px; font-size: 16px; font-weight: 800; display: flex; justify-content: space-between; }
          .total-row .value { color: #059669; font-size: 17px; }
          .portal-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center; }
          .portal-box p { margin: 0 0 12px 0; font-size: 13px; color: #1e3a8a; font-weight: 600; }
          .btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%); color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
          .footer { background: #f1f5f9; padding: 22px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GoTechEdu Learning Hub</h1>
            <p>Official Enrollment Receipt & Tax Invoice</p>
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
                <span>${formattedDate.split(",")[0]}</span>
              </div>

              <div class="row">
                <span class="label">Student Name:</span>
                <span class="value">${studentName}</span>
              </div>
              <div class="row">
                <span class="label">Registered Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="row">
                <span class="label">Contact Phone:</span>
                <span class="value">${phone || "N/A"}</span>
              </div>
              <div class="row">
                <span class="label">Program Enrolled:</span>
                <span class="value">${courseTitle}</span>
              </div>
              <div class="row">
                <span class="label">Assigned Cohort:</span>
                <span class="value">${batch || "Current Cohort 2026"}</span>
              </div>
              <div class="row">
                <span class="label">Payment ID:</span>
                <span class="value" style="font-family: monospace; font-size: 12px;">${paymentId}</span>
              </div>
              <div class="row">
                <span class="label">Order ID:</span>
                <span class="value" style="font-family: monospace; font-size: 12px;">${orderId}</span>
              </div>

              <div class="divider"></div>

              <div class="row">
                <span class="label">Tuition Base Fee:</span>
                <span class="value">${formattedBaseFee}</span>
              </div>
              <div class="row">
                <span class="label">GST (18% inclusive):</span>
                <span class="value">${formattedGst}</span>
              </div>

              <div class="total-row">
                <span class="label">Total Paid (INR):</span>
                <span class="value">${formattedAmount}</span>
              </div>
            </div>

            <div class="portal-box">
              <p>Your student account is active! Log in to the GoTechEdu Portal using your registered email address to access live classes, curriculum modules, and interactive labs.</p>
              <a href="${resolvedPortalUrl}" class="btn" target="_blank">
                Access Student Portal →
              </a>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0;"><strong>GoTechEdu Academy</strong> • Gurugram, HQ</p>
            <p style="margin: 0; font-size: 11px; opacity: 0.85;">Need assistance? Reply to this email or contact support@gotechedu.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailViaBrevo({
      to: email,
      name: studentName,
      subject,
      htmlContent,
    });
  } catch (err) {
    console.error("sendPaymentInvoiceEmail Error:", err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendEmailViaBrevo,
  sendEmployeeWelcomeEmail,
  sendPasswordResetOtpEmail,
  sendPaymentInvoiceEmail,
};
