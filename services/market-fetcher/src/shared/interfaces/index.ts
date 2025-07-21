export interface TickerData {
  symbol: string
  timestamp: number
  bid: number
  ask: number
  last: number
  volume: number
  quoteVolume: number
  change: number
  percentage: number
  high: number
  low: number
}

export interface CacheService {
  set(key: string, data: any): Promise<void>
  setMultiple(marketType: string, data: Record<string, any>): Promise<void>
  get(key: string): Promise<any>
  getMultiple(keys: string[]): Promise<Record<string, any>>
  getMarketData?(marketType: 'spot' | 'futures'): Promise<Record<string, any>>
  disconnect(): Promise<void>
}

export interface ExchangeProvider {
  fetchFilteredTickers(): Promise<any[]>
}

export interface MarketService {
  fetchAndStoreData(marketType?: 'spot' | 'futures'): Promise<void>
  getLatestData(marketType: 'spot' | 'futures'): Promise<Record<string, any>>
  getType(): 'spot' | 'futures'
}
