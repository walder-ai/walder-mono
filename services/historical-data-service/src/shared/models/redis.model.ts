export interface RedisOHLCVData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface RedisKeyParams {
  exchange: string
  marketType: 'spot' | 'futures'
  symbol: string
  timeframe: string
  dataType: 'open' | 'high' | 'low' | 'close' | 'volume'
}

export class RedisTimeSeriesKeyBuilder {
  static buildKey(params: RedisKeyParams): string {
    return `data:${params.exchange}:${params.marketType}:${params.symbol}:5m:${params.dataType}`
  }

  static buildProgressKey(exchange: string, marketType: 'spot' | 'futures', symbol: string): string {
    return `data:${exchange}:${marketType}:${symbol}:5m:progress`
  }

  static parseKey(key: string): { exchange: string; marketType: string; symbol: string; dataType: string } | null {
    const parts = key.split(':')
    if (parts.length !== 6) return null
    
    return {
      exchange: parts[1],
      marketType: parts[2],
      symbol: parts[3],
      dataType: parts[5]
    }
  }
} 