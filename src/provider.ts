import { createProvider } from '@builderbot/bot'
import { MetaProvider as BaseMetaProvider } from '@builderbot/provider-meta'
import { META_CONFIG } from './config'

class MetaProvider extends BaseMetaProvider {
    protected beforeHttpServerInit(): void {
        this.server = this.server
            .use((req: any, res: any, next: any) => {
                const method = req?.method ?? ''

                // Lógica para responder el reto (challenge) de Meta
                if (method === 'GET' && req.query['hub.verify_token']) {
                    const token = req.query['hub.verify_token']
                    const challenge = req.query['hub.challenge']

                    // ✅ FIX: Usar variable de entorno en lugar de string hardcodeado
                    if (token === process.env.META_VERIFY_TOKEN) {
                        return res.status(200).send(challenge)
                    }
                }
                return next()
            })

        super.beforeHttpServerInit()
    }
}

export const adapterProvider = createProvider(MetaProvider, META_CONFIG)