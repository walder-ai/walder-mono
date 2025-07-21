import * as ccxt from 'ccxt'
import { BaseExchangeProvider } from './base-exchange.provider'

export class SpotExchangeProvider extends BaseExchangeProvider {
  constructor() {
    super(ccxt.binance, {})
  }

  getMarketType(): 'spot' {
    return 'spot'
  }

  isValidMarket(market: any): boolean {
    return market?.active === true && 
           market.spot === true && 
           market.quote === 'USDT'
  }
}
