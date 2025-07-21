/**
 * Generic ticker transformer utility
 * Can transform any raw ticker data to essential format
 */
export class TickerTransformer {
  /**
   * Transform single raw ticker to essential format
   */
  static transformTicker<T>(rawTicker: any): T {
    return {
      symbol: rawTicker.symbol,
      price: rawTicker.last || 0,
      change: rawTicker.change || 0,
      changePercent: rawTicker.percentage || 0,
      high: rawTicker.high || 0,
      low: rawTicker.low || 0,
      volume: rawTicker.baseVolume || 0,
      volumeUSD: rawTicker.quoteVolume || 0,
      vwap: rawTicker.vwap || 0,
      timestamp: rawTicker.timestamp || Date.now(),
      datetime: rawTicker.datetime || new Date().toISOString()
    } as T
  }

  /**
   * Transform collection of raw tickers to essential format
   */
  static transformTickers<T>(rawTickers: Record<string, any>): Record<string, T> {
    const transformedTickers: Record<string, T> = {}

    for (const [symbol, rawTicker] of Object.entries(rawTickers)) {
      transformedTickers[symbol] = this.transformTicker<T>(rawTicker)
    }

    return transformedTickers
  }

  /**
   * Alias for transformTickers to match new interface
   */
  static transformMultiple<T>(rawTickers: Record<string, any>): Record<string, T> {
    return this.transformTickers<T>(rawTickers)
  }

  /**
   * Calculate data reduction statistics
   */
  static getCompressionStats(originalData: any, transformedData: any): {
    originalSize: number
    compressedSize: number
    compressionRatio: number
    compressionPercent: number
  } {
    const originalSize = JSON.stringify(originalData).length
    const compressedSize = JSON.stringify(transformedData).length
    const compressionRatio = originalSize / compressedSize
    const compressionPercent = ((originalSize - compressedSize) / originalSize) * 100

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      compressionPercent
    }
  }
} 