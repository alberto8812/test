import nodemailer from 'nodemailer'
import { sanitizeForEmail } from '../utils/sanitizers'
import { BotLogger } from '../utils/logger'
import { validateEmailEnv } from '../config'

const MAX_REINTENTOS_EMAIL = 3

export async function sendEmail(subject: string, body: string, maxReintentos = MAX_REINTENTOS_EMAIL): Promise<boolean> {
  try { validateEmailEnv() } catch (e) { BotLogger.error('Config email inválida', e); return false }

  for (let i = 1; i <= maxReintentos; i++) {
    try {
      const t = nodemailer.createTransport({
        host: 'smtp.office365.com', port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { ciphers: 'TLSv1.2', rejectUnauthorized: true },
      })
      await t.sendMail({
        from: process.env.EMAIL_USER, to: process.env.EMAIL_TO,
        subject: sanitizeForEmail(subject),
        text: sanitizeForEmail(body),
        html: `<pre style="font-family:monospace;white-space:pre-wrap;">${sanitizeForEmail(body)}</pre>`,
      })
      BotLogger.success('📧 Correo enviado', { subject, intento: i })
      return true
    } catch (e) {
      BotLogger.error(`Error intento ${i}/${maxReintentos}`, e)
      if (i < maxReintentos) await new Promise((r) => setTimeout(r, 2000 * i))
    }
  }
  return false
}
