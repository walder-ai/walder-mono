export interface AppConfig {
  port: number
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
  redis: {
    url: string
  }
}

export function loadConfig(): AppConfig {
  return {
    port: 3000,
    exchange: {
      name: 'binance',
      rateLimit: true
    },
    market: {
      allSymbols: process.env.MARKET_ALL_SYMBOLS === 'true',
      activeOnly: process.env.MARKET_ACTIVE_ONLY !== 'false', // Default true, set to false to include delisted pairs
      spot: {
        enabled: process.env.MARKET_SPOT_ENABLED === 'true',
        symbols: process.env.MARKET_SPOT_SYMBOLS?.split(',') || []
      },
      futures: {
        enabled: process.env.MARKET_FUTURES_ENABLED === 'true',
        symbols: process.env.MARKET_FUTURES_SYMBOLS?.split(',') || []
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  }
} 