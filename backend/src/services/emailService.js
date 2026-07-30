// Email service (sends OTP codes via Gmail SMTP)
require("dotenv").config();
const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

let transporter = null;
if (EMAIL_USER && EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD,
    },
  });
}

// Send an email
const sendEmail = async (to, subject, html) => {
  // Dev mode / missing credentials: log only, no real email
  if (process.env.NODE_ENV !== "production" || !transporter) {
    console.log(`[EMAIL - DEV MODE]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { status: "dev_logged", to, subject };
  }

  try {
    const info = await transporter.sendMail({
      from: `"MediFind Rwanda" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to} (${info.messageId})`);
    return { status: "sent", messageId: info.messageId };
  } catch (err) {
    // Never crash the app if email fails
    console.error(`Email failed to ${to}:`, err.message);
    return { status: "failed", error: err.message };
  }
};

// Message templates
const templates = {
  otp: (code) => ({
    subject: "Your MediFind Rwanda verification code",
    html: `
      <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F6E56;">MediFind Rwanda</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.2em;color:#1D9E75;">${code}</p>
        <p style="color:#5F5E5A;font-size:13px;">This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };
