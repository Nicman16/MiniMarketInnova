const crypto = require('crypto');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { getAppUrl } = require('../config/env');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);

let smtpTransporter = null;
const getSmtpTransporter = () => {
  if (!smtpConfigured) return null;
  if (smtpTransporter) return smtpTransporter;
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return smtpTransporter;
};

const hashVerificationToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 horas
  };
};

const sendVerificationEmail = async ({ email, nombre, token }) => {
  const activationLink = `${getAppUrl()}/activar?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2>Hola ${nombre || 'usuario'},</h2>
      <p>Tu cuenta fue creada en MiniMarket Innova.</p>
      <p>Para activar tu acceso usa este enlace:</p>
      <p><a href="${activationLink}">${activationLink}</a></p>
      <p>Este enlace vence en 24 horas.</p>
    </div>
  `;

  if (resend && process.env.RESEND_FROM_EMAIL) {
    await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to: email, subject: 'Activa tu cuenta de MiniMarket Innova', html });
    return { sent: true, provider: 'resend', activationLink };
  }

  const smtp = getSmtpTransporter();
  if (smtp) {
    await smtp.sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Activa tu cuenta de MiniMarket Innova', html });
    return { sent: true, provider: 'smtp', activationLink };
  }

  console.warn(`⚠️ Correo no enviado a ${email}. Configura Resend o SMTP.`);
  console.warn(`🔗 Enlace de activación: ${activationLink}`);
  return { sent: false, provider: 'manual', activationLink };
};

module.exports = { hashVerificationToken, createVerificationToken, sendVerificationEmail };
