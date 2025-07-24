export interface OHLCVData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TimeSeriesData extends OHLCVData {
  symbol: string
  datetime: string
}

export interface TimeSeriesService {
  addDataPoint(key: string, timestamp: number, value: number): Promise<void>
  addBulkData(key: string, data: OHLCVData[]): Promise<void>
  getRange(key: string, fromTimestamp: number, toTimestamp: number): Promise<OHLCVData[]>
  getLastTimestamp(key: string): Promise<number | null>
  disconnect(): Promise<void>
}

export interface CacheService {
  set(key: string, data: any): Promise<void>
  get(key: string): Promise<any>
  disconnect(): Promise<void>
}

export interface ExchangeProvider {
  getMarketType(): 'spot' | 'futures'
  fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number): Promise<OHLCVData[]>
  fetchFilteredSymbols(): Promise<string[]>
}

export interface HistoricalService {
  backfillSymbol(symbol: string, marketType: 'spot' | 'futures'): Promise<void>
  updateSymbol(symbol: string, marketType: 'spot' | 'futures'): Promise<void>
  getProgress(symbol: string, marketType: 'spot' | 'futures'): Promise<{ lastTimestamp: number | null; isComplete: boolean }>
}

export interface RateLimiter {
  canExecute(): boolean
  waitTime(): number
  markRequest(): void
} 