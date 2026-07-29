// ─────────────────────────────────────────────────────────────────────────────
//  MediFind Rwanda — MTN SMS v3 Service
//  Token URL:  https://api.mtn.com/v1/oauth/access_token/accesstoken
//  SMS URL:    https://api.mtn.com/v3/sms/outbound
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();

const TOKEN_URL = "https://api.mtn.com/v1/oauth/access_token/accesstoken?grant_type=client_credentials";
const SMS_URL   = "https://api.mtn.com/v3/sms/outbound";
const API_KEY   = process.env.MTN_API_KEY;
const API_SECRET= process.env.MTN_API_SECRET;
const SENDER_ID = process.env.SMS_SENDER_ID || "MediFind";

// ── Get OAuth token from MTN ──────────────────────────────────────────────────
const getAccessToken = async () => {
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MTN token error: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
};

// ── Send SMS ──────────────────────────────────────────────────────────────────
const sendSMS = async (to, message) => {
  // Development mode — log only, no real SMS
  if (process.env.NODE_ENV !== "production") {
    console.log(`📱 [SMS - DEV MODE]`);
    console.log(`   To:      ${to}`);
    console.log(`   Message: ${message}`);
    return { status: "dev_logged", to, message };
  }

  try {
    const token = await getAccessToken();

    // Format phone: remove spaces and +  e.g. +250788123456 → 250788123456
    const phone = to.replace(/\s+/g, "").replace("+", "");

    const res = await fetch(SMS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        senderAddress:   SENDER_ID,
        receiverAddress: [phone],
        message:         message,
        clientCorrelator:`medifind-${Date.now()}`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`MTN SMS error: ${JSON.stringify(data)}`);
    }

    console.log(`✅ SMS sent to ${to}`);
    return { status: "sent", data };

  } catch (err) {
    // Never crash the app if SMS fails
    console.error(`❌ SMS failed to ${to}:`, err.message);
    return { status: "failed", error: err.message };
  }
};

// ── Message templates ─────────────────────────────────────────────────────────
const messages = {
  otp: (code) =>
    `Your MediFind Rwanda code is: ${code}. Valid for 10 minutes. Do not share this code.`,

  lowStock: (drugName, quantity, unit) =>
    `MediFind Rwanda: ${drugName} is running low (${quantity} ${unit} remaining). Please restock soon.`,

  outOfStock: (drugName) =>
    `MediFind Rwanda: ${drugName} is now out of stock at your facility. Update your inventory once restocked.`,

  drugAvailable: (drugName, facilityName, distanceKm) =>
    `MediFind Rwanda: ${drugName} is now in stock at ${facilityName} (${distanceKm} km away). Open the app for directions.`,

  welcomePatient: (name) =>
    `Welcome to MediFind Rwanda, ${name}! Search for medicines near you and get alerts when they become available.`,

  facilityApproved: (facilityName) =>
    `MediFind Rwanda: ${facilityName} has been approved! You can now log in and update your medicine inventory.`,

  facilityRejected: (facilityName) =>
    `MediFind Rwanda: Your application for ${facilityName} could not be approved. Contact support@medifind.rw.`,
};

module.exports = { sendSMS, messages };
