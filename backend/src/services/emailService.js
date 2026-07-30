// ─────────────────────────────────────────────────────────────────────────────
//  MediFind Rwanda — Email Service (Brevo HTTP API)
//  Used to deliver real OTP codes to a patient's email address.
//  Uses Brevo because it only requires verifying a single sender address
//  (via a confirmation email link) rather than a full domain + DNS records,
//  so it works immediately without waiting on DNS propagation.
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
// Must be the exact email address you verified as a Sender in Brevo.
const FROM_EMAIL = process.env.EMAIL_FROM || "";
const FROM_NAME = "MediFind Rwanda";

// ── Send an email ──────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  // Dev mode / missing credentials — log only, no real email
  if (process.env.NODE_ENV !== "production" || !BREVO_API_KEY || !FROM_EMAIL) {
    console.log(`📧  [EMAIL - DEV MODE]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { status: "dev_logged", to, subject };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Brevo API error (status ${response.status})`);
    }

    console.log(`✅  Email sent to ${to} (${data.messageId})`);
    return { status: "sent", messageId: data.messageId };
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

  drugAvailable: (drugName, facilityName, distanceKm) => ({
    subject: `${drugName} is now available near you`,
    html: `
      <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:24px;">
        <h2 style="color:#0F6E56;">MediFind Rwanda</h2>
        <p><b>${drugName}</b> is now in stock at:</p>
        <p style="font-size:18px;font-weight:700;color:#1D9E75;">${facilityName}</p>
        <p style="color:#5F5E5A;font-size:13px;">${distanceKm} km away from your last known location.</p>
        <p style="color:#5F5E5A;font-size:13px;">Open MediFind Rwanda for directions and contact details.</p>
      </div>
    `,
  }),

  lowStock: (drugName, quantity, unit) => ({
    subject: `Low stock alert: ${drugName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:24px;">
        <h2 style="color:#BA7517;">MediFind Rwanda — Low Stock</h2>
        <p><b>${drugName}</b> is running low at your facility.</p>
        <p style="font-size:18px;font-weight:700;color:#BA7517;">${quantity} ${unit} remaining</p>
        <p style="color:#5F5E5A;font-size:13px;">Please restock soon to avoid running out.</p>
      </div>
    `,
  }),

  outOfStock: (drugName) => ({
    subject: `Out of stock: ${drugName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;padding:24px;">
        <h2 style="color:#A32D2D;">MediFind Rwanda — Out of Stock</h2>
        <p><b>${drugName}</b> is now out of stock at your facility.</p>
        <p style="color:#5F5E5A;font-size:13px;">Update your inventory once restocked so patients can find it again.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };