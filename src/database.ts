import { MysqlAdapter } from '@builderbot/database-mysql'
import { DB_CONFIG } from './config'

export const adapterDB = new MysqlAdapter(DB_CONFIG)
