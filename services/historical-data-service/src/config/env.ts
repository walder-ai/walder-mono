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
    requestsPerMinute: number
    requestDelay: number
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
  historical: {
    startDate: string
    timeframe: string
    batchSize: number
    retryAttempts: number
    retryDelay: number
    backfillFirst: boolean
  }
  scheduler: {
    enabled: boolean
    interval: number
    backfillInterval: number
  }
  redis: {
    url: string
    keyPrefix: string
  }
}

export function loadConfig(): AppConfig {
  return {
    service: {
      name: process.env.SERVICE_NAME || 'historical-data-service',
      port: parseInt(process.env.PORT || '3001'),
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    exchange: {
      name: process.env.EXCHANGE_NAME || 'binance',
      rateLimit: process.env.EXCHANGE_RATE_LIMIT !== 'false',
      requestsPerMinute: parseInt(process.env.EXCHANGE_REQUESTS_PER_MINUTE || '300'),
      requestDelay: parseInt(process.env.EXCHANGE_REQUEST_DELAY || '1000')
    },
    market: {
      allSymbols: process.env.MARKET_ALL_SYMBOLS === 'true',
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
    historical: {
      startDate: process.env.HISTORICAL_START_DATE || '2025-01-01',
      timeframe: process.env.HISTORICAL_TIMEFRAME || '5m',
      batchSize: parseInt(process.env.HISTORICAL_BATCH_SIZE || '500'),
      retryAttempts: parseInt(process.env.HISTORICAL_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.HISTORICAL_RETRY_DELAY || '10000'),
      backfillFirst: process.env.HISTORICAL_BACKFILL_FIRST !== 'false'
    },
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED !== 'false',
      interval: parseInt(process.env.SCHEDULER_INTERVAL || '300000'),
      backfillInterval: parseInt(process.env.SCHEDULER_BACKFILL_INTERVAL || '3600000')
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://lredis-service:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || '5m'
    }
  }
} 