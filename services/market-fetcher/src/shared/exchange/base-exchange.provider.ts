import * as ccxt from 'ccxt'
import { config } from '../../config'
import { ExchangeProvider, TickerData } from '../interfaces'

export abstract class BaseExchangeProvider implements ExchangeProvider {
  protected exchange: ccxt.Exchange

  constructor(exchangeClass: new (config: any) => ccxt.Exchange, options: any = {}) {
    this.exchange = new exchangeClass({
      enableRateLimit: config.exchange.rateLimit,
      ...options
    })
  }

  abstract getMarketType(): 'spot' | 'futures'
  abstract isValidMarket(market: any): boolean

  async fetchTickers(symbols?: string[]): Promise<Record<string, TickerData>> {
    if (symbols) {
      return await this.exchange.fetchTickers(symbols)
    }
    return await this.exchange.fetchTickers()
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

  private getConfiguredSymbols(): string[] {
    return this.getMarketType() === 'spot' 
      ? config.market.spot.symbols
      : config.market.futures.symbols
  }
}
