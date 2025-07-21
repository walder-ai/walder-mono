/**
 * Symbol normalization utilities for Redis keys
 */

export class SymbolNormalizer {
  /**
   * Normalize symbol for Redis key
   * BTC/USDT:USDT -> BTCUSDT
   * BTC/USDT -> BTCUSDT
   * ETH/USDT:USDT -> ETHUSDT
   */
  static normalize(symbol: string): string {
    // For futures symbols like BTC/USDT:USDT, take only the base pair BTC/USDT
    const basePair = symbol.split(':')[0]
    
    return basePair
      .replace(/\//g, '') // Remove /
      .toUpperCase()
  }

  /**
   * Normalize multiple symbols
   */
  static normalizeSymbols(symbols: string[]): string[] {
    return symbols.map(symbol => this.normalize(symbol))
  }

  /**
   * Normalize record keys
   */
  static normalizeRecordKeys<T>(record: Record<string, T>): Record<string, T> {
    const normalized: Record<string, T> = {}
    
    Object.entries(record).forEach(([symbol, data]) => {
      const normalizedSymbol = this.normalize(symbol)
      normalized[normalizedSymbol] = data
    })
    
    return normalized
  }
} 