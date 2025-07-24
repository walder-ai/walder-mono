import * as ccxt from 'ccxt'
import { ExchangeProvider, OHLCVData } from '../interfaces'
import { config } from '../../config'
import { TokenBucketRateLimiter } from '../../utils/rate-limiter'

export abstract class BaseExchangeProvider implements ExchangeProvider {
  protected exchange: ccxt.Exchange
  protected rateLimiter: TokenBucketRateLimiter

  constructor(exchangeClass: new (config: any) => ccxt.Exchange, options: any = {}) {
    this.exchange = new exchangeClass({
      enableRateLimit: config.exchange.rateLimit,
      rateLimit: config.exchange.requestDelay,
      ...options
    })

    this.rateLimiter = new TokenBucketRateLimiter(
      config.exchange.requestsPerMinute,
      config.exchange.requestsPerMinute,
      config.exchange.requestDelay
    )
  }

  abstract getMarketType(): 'spot' | 'futures'
  abstract isValidMarket(market: any): boolean

  async fetchOHLCV(symbol: string, timeframe: string = '5m', since?: number, limit?: number): Promise<OHLCVData[]> {
    await this.waitForRateLimit()
    
    try {
      const rawData = await (this.exchange as any).fetchOHLCV(symbol, timeframe, since, limit)
      this.rateLimiter.markRequest()
      
      return rawData.map(([timestamp, open, high, low, close, volume]: [number, number, number, number, number, number]) => ({
        timestamp,
        open: open || 0,
        high: high || 0,
        low: low || 0,
        close: close || 0,
        volume: volume || 0
      }))
    } catch (error) {
      throw error
    }
  }

  async fetchFilteredSymbols(): Promise<string[]> {
    if (!config.market.allSymbols) {
      return this.getConfiguredSymbols()
    }

    try {
      await this.exchange.loadMarkets()
      const markets = this.exchange.markets
      
      const symbols: string[] = []
      for (const [symbol, market] of Object.entries(markets)) {
        if (this.isValidMarket(market)) {
          symbols.push(symbol)
        }
      }
      
      return config.market.activeOnly ? symbols : Object.keys(markets)
    } catch (error) {
      return this.getConfiguredSymbols()
    }
  }

  private async waitForRateLimit(): Promise<void> {
    while (!this.rateLimiter.canExecute()) {
      const waitTime = this.rateLimiter.waitTime()
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      } else {
        break
      }
    }
  }

  private getConfiguredSymbols(): string[] {
    return this.getMarketType() === 'spot' 
      ? config.market.spot.symbols
      : config.market.futures.symbols
  }

  getRateLimiterStats() {
    return this.rateLimiter.getStats()
  }
} 