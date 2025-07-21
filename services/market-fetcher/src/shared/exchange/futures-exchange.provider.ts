import * as ccxt from 'ccxt'
import { BaseExchangeProvider } from './base-exchange.provider'

export class FuturesExchangeProvider extends BaseExchangeProvider {
  constructor() {
    super(ccxt.binanceusdm, { swap: true })
  }

  getMarketType(): 'futures' {
    return 'futures'
  }

  isValidMarket(market: any): boolean {
    return market?.active === true && 
           (market.swap === true || market.type === 'swap') && 
           market.settle === 'USDT'
  }
}
