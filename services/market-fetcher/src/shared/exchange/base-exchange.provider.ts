import * as ccxt from 'ccxt'
import { config } from '../../config'
import { ExchangeProvider, TickerData } from '../interfaces'

export abstract class BaseExchangeProvider implements ExchangeProvider {
  protected exchange: ccxt.Exchange

  constructor(exchangeClass: new (config: any) => ccxt.Exchange, options: any = {}) {
    this.exchange = new exchangeClass({
      enableRateLimit: config.exchange.rateLimit,
      timeout: 30000, // 30 second timeout
      ...options
    })
  }

  abstract getMarketType(): 'spot' | 'futures'
  abstract isValidMarket(market: any): boolean

  async fetchTickers(symbols?: string[]): Promise<Record<string, TickerData>> {
    return await this.withRetry(async () => {
      if (symbols) {
        return await this.exchange.fetchTickers(symbols)
      }
      return await this.exchange.fetchTickers()
    })
  }

  async fetchFilteredTickers(): Promise<Record<string, TickerData>> {
    if (!config.market.allSymbols) {
      const symbols = this.getConfiguredSymbols()
      return await this.fetchTickers(symbols)
    }

    if (!config.market.activeOnly) {
      return await this.fetchTickers()
    }

    try {
      const allTickers = await this.fetchTickers()
      await this.exchange.loadMarkets()
      
      const filtered: Record<string, TickerData> = {}
      
      for (const [symbol, ticker] of Object.entries(allTickers)) {
        const market = this.exchange.markets[symbol]
        if (this.isValidMarket(market)) {
          filtered[symbol] = ticker
        }
      }
      
      return filtered
    } catch (error) {
      return await this.fetchTickers()
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: unknown) {
        const err = error as Error
        lastError = err
        
        if (this.shouldRetry(err, attempt, maxRetries)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Exponential backoff, max 10s
          console.log(`🔄 Retry ${attempt}/${maxRetries} after ${delay}ms: ${err.message}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        throw error
      }
    }
    
    throw lastError!
  }

  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false
    
    // Retry on network errors and rate limits
    const errorName = error.constructor.name
    if (errorName === 'NetworkError') return true
    if (errorName === 'RateLimitExceeded') return true
    if (errorName === 'ExchangeNotAvailable') return true
    if (errorName === 'RequestTimeout') return true
    
    // Don't retry on other errors
    return false
  }

  private getConfiguredSymbols(): string[] {
    return this.getMarketType() === 'spot' 
      ? config.market.spot.symbols
      : config.market.futures.symbols
  }
}
