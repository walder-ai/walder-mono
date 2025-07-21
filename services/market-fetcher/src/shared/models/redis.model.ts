export interface RedisTickerData {
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

export interface RedisKeyParams {
  exchange: string
  marketType: 'spot' | 'futures'
  symbol: string
}

export class RedisKeyBuilder {
  static buildKey(params: RedisKeyParams): string {
    return `data:${params.exchange}:${params.marketType}:${params.symbol}:data`
  }
}
