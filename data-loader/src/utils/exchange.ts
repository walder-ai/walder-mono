import ccxt from 'ccxt';
import { config } from './config';

export abstract class ExchangeService {
  private static exchange: any = null;
  
  private static getExchange(): any {
    if (!this.exchange) {
      const Binance = ccxt.binance as any;
      this.exchange = new Binance(config.exchange.options);
    }
    return this.exchange;
  }
  
  static async getActiveSymbols(): Promise<string[]> {
    try {
      const exchange = this.getExchange();
      await exchange.loadMarkets();
      
      return Object.keys(exchange.markets)
        .filter(symbol => {
          const market = exchange.markets[symbol];
          return market.active && 
                 market.swap === true && 
                 market.quote === 'USDT'
        });
    } catch (error) {
      console.error('Error fetching symbols:', error);
      return [];
    }
  }

  static async fetchOHLCV(
    symbol: string, 
    timeframe: string, 
    since: number, 
    limit: number
  ): Promise<number[][]> {
    try {
      const exchange = this.getExchange();
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
      return ohlcv;
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol}:`, error);
      return [];
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const exchange = this.getExchange();
      await exchange.loadMarkets();
      return true;
    } catch (error) {
      console.error('Exchange connection test failed:', error);
      return false;
    }
  }
};