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

export interface ExchangeProvider {
  fetchTickers(symbols?: string[]): Promise<Record<string, TickerData>>
  fetchFilteredTickers(): Promise<Record<string, TickerData>>
}

export interface MarketService {
  getType(): 'spot' | 'futures'
  fetchAndStoreData(): Promise<void>
}

export interface CacheService {
  set(key: string, data: any): Promise<void>
  setMultiple(marketType: string, data: Record<string, any>): Promise<void>
  get(key: string): Promise<any>
  getMultiple(keys: string[]): Promise<Record<string, any>>
}
