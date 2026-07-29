// ─────────────────────────────────────────────────────────────────────────────
//  MediFind Rwanda — Email Service (Resend HTTP API)
//  Used to deliver real OTP codes to a patient's email address.
//  Switched from SMTP (Nodemailer) to Resend because cloud hosts like Render
//  block or throttle outbound SMTP ports (465/587), causing timeouts.
//  Resend sends over regular HTTPS, which is never blocked.
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// While your own domain isn't verified on Resend yet, use their shared test
// sender. Once you verify a domain at resend.com/domains, switch this to
// something like "MediFind Rwanda <no-reply@yourdomain.com>".
const FROM_ADDRESS = process.env.EMAIL_FROM || "MediFind Rwanda <onboarding@resend.dev>";

// ── Send an email ──────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  // Dev mode / missing credentials — log only, no real email
  if (process.env.NODE_ENV !== "production" || !RESEND_API_KEY) {
    console.log(`📧  [EMAIL - DEV MODE]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { status: "dev_logged", to, subject };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Resend API error (status ${response.status})`);
    }

    console.log(`✅  Email sent to ${to} (${data.id})`);
    return { status: "sent", messageId: data.id };
  } catch (err) {
    // Never crash the app if email fails
    console.error(`❌  Email failed to ${to}:`, err.message);
    return { status: "failed", error: err.message };
  }
};

// ── Message templates ─────────────────────────────────────────────────────
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
