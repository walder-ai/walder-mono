export interface AppConfig {
  service: {
    name: string
    port: number
    environment: string
    logLevel: string
  }
  exchange: {
    name: string
    rateLimit: boolean
  }
  market: {
    allSymbols: boolean
    activeOnly: boolean
    spot: {
      enabled: boolean
      symbols: string[]
    }
    futures: {
      enabled: boolean
      symbols: string[]
    }
  }
  scheduler: {
    enabled: boolean
    interval: number
  }
  redis: {
    url: string
  }
}

export function loadConfig(): AppConfig {
  return {
    service: {
      name: process.env.SERVICE_NAME || 'market-fetcher',
      port: parseInt(process.env.PORT || '3000'),
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    exchange: {
      name: process.env.EXCHANGE_NAME || 'binance',
      rateLimit: process.env.EXCHANGE_RATE_LIMIT === 'true'
    },
    market: {
      allSymbols: process.env.MARKET_ALL_SYMBOLS !== 'false',
      activeOnly: process.env.MARKET_ACTIVE_ONLY !== 'false',
      spot: {
        enabled: process.env.MARKET_SPOT_ENABLED !== 'false',
        symbols: process.env.MARKET_SPOT_SYMBOLS?.split(',') || ['BTC/USDT', 'ETH/USDT']
      },
      futures: {
        enabled: process.env.MARKET_FUTURES_ENABLED !== 'false',
        symbols: process.env.MARKET_FUTURES_SYMBOLS?.split(',') || ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT']
      }
    },
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED !== 'false',
      interval: parseInt(process.env.SCHEDULER_INTERVAL || '5000')
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://lredis-service:6379'
    }
  }
} 