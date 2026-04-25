import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export const PORT = process.env.PORT ?? 3008

export const META_CONFIG = {
    jwtToken: process.env.META_ACCESS_TOKEN,
    numberId: process.env.META_NUMBER_ID,
    verifyToken: process.env.META_VERIFY_TOKEN,
    version: process.env.META_VERSION
}

export const EMAIL_CONFIG = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    to: process.env.EMAIL_TO
}

export function validateEnv() {
    if (!META_CONFIG.jwtToken || !META_CONFIG.numberId || !META_CONFIG.verifyToken || !META_CONFIG.version) {
        throw new Error('❌ Faltan variables de entorno esenciales en .env')
    }
}

export const DB_CONFIG = {
  host: process.env.MYSQL_DB_HOST ?? 'localhost',
  user: process.env.MYSQL_DB_USER ?? '',
  database: process.env.MYSQL_DB_NAME ?? '',
  password: process.env.MYSQL_DB_PASSWORD ?? '',
  port: Number(process.env.MYSQL_DB_PORT ?? 3306),
}

export function validateEmailEnv() {
    if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass || !EMAIL_CONFIG.to) {
        throw new Error('❌ Faltan variables de entorno para email en .env')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(EMAIL_CONFIG.user)) {
        throw new Error('EMAIL_USER no es un email válido')
    }
}
