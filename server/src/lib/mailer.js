import nodemailer from "nodemailer";

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}


// Sends a one-time code by email. If SMTP isn't configured, logs it to the
// server console instead — handy for local development without mail setup.
// Returns { emailed: boolean } so callers can decide whether to also surface
// the code some other way (e.g. in the API response during local dev).
export async function sendOtpEmail(email, code) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — OTP for ${email}: ${code}\n`);
    return { emailed: false };
  }
  await t.sendMail({
    from: process.env.SMTP_FROM || "RepoDNA <no-reply@repodna.dev>",
    to: email,
    subject: "Your RepoDNA verification code",
    text: `Your RepoDNA verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your RepoDNA verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes.</p>`,
  });
  return { emailed: true };
}
