export class BotLogger {
  private static log(level: string, message: string, data?: unknown) {
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`, data ? JSON.stringify(data) : '')
  }
  static info(msg: string, data?: unknown) { this.log('INFO', msg, data) }
  static error(msg: string, err?: unknown) { this.log('ERROR', msg, err) }
  static success(msg: string, data?: unknown) { this.log('SUCCESS', msg, data) }
  static warning(msg: string, data?: unknown) { this.log('WARNING', msg, data) }
}
