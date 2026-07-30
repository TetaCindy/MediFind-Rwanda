// Email service (sends OTP codes via Brevo's HTTP API)
//
// Note: this uses Brevo's REST API over HTTPS, not SMTP. Render's free
// tier blocks outbound SMTP ports (25, 465, 587), so a normal SMTP
// library like nodemailer would time out. Brevo's API runs over port
// 443, same as any other HTTPS request, so it works on the free tier.
require("dotenv").config();

const BREVO_API_KEY     = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// Send an email
const sendEmail = async (to, subject, html) => {
  // Dev mode / missing credentials: log only, no real email
  if (process.env.NODE_ENV !== "production" || !BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    console.log(`[EMAIL - DEV MODE]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { status: "dev_logged", to, subject };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "MediFind Rwanda", email: BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Brevo API error (${res.status})`);
    }

    console.log(`Email sent to ${to} (${data.messageId})`);
    return { status: "sent", messageId: data.messageId };
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
