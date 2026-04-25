import { createBot } from '@builderbot/bot'
import { adapterProvider } from './provider'
import { adapterFlow } from './flows/index'
import { adapterDB } from './database'

const PORT = process.env.PORT ?? 3008

const main = async () => {
    try {
        console.log('🚀 Iniciando NovaDesk Bot...')

        const { httpServer } = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        })

        httpServer(+PORT)

        console.log(`✅ NovaDesk Bot corriendo en puerto ${PORT}`)
        console.log(`📡 Esperando mensajes de WhatsApp...`)
    } catch (error) {
        console.error('❌ Error al iniciar el bot:', error)
        process.exit(1)
    }
}
main().catch(console.error)


