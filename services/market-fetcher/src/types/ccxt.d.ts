declare module 'ccxt' {
  export interface Exchange {
    fetchTickers(symbols?: string[]): Promise<Record<string, any>>
    loadMarkets(): Promise<Record<string, any>>
    markets: Record<string, any>
  }

  export class binance implements Exchange {
    constructor(options?: any)
    fetchTickers(symbols?: string[]): Promise<Record<string, any>>
    loadMarkets(): Promise<Record<string, any>>
    markets: Record<string, any>
  }

  export class binanceusdm implements Exchange {
    constructor(options?: any)
    fetchTickers(symbols?: string[]): Promise<Record<string, any>>
    loadMarkets(): Promise<Record<string, any>>
    markets: Record<string, any>
  }
}
