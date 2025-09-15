export class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('INFO', message, data));
  }

  error(message: string, error?: any) {
    const errorData = error instanceof Error ?
      { message: error.message, stack: error.stack } :
      error;
    console.error(this.formatMessage('ERROR', message, errorData));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('WARN', message, data));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
}

export const logger = new Logger();