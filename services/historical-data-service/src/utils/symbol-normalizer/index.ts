export class SymbolNormalizer {
  static normalize(symbol: string): string {
    const basePair = symbol.split(':')[0]
    return basePair
      .replace(/\//g, '')
      .toUpperCase()
  }

  static normalizeSymbols(symbols: string[]): string[] {
    return symbols.map(symbol => this.normalize(symbol))
  }

  static denormalize(symbol: string, marketType: 'spot' | 'futures'): string {
    // Для большинства пар base заканчивается на известные монеты
    const commonQuotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB']
    
    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length)
        if (base.length > 0) {
          const pair = `${base}/${quote}`
          return marketType === 'futures' ? `${pair}:${quote}` : pair
        }
      }
    }
    
    // Fallback: попробуем разделить по последним 3-4 символам
    if (symbol.length >= 6) {
      // Пробуем сначала 4 символа (USDT), потом 3 (BTC, ETH)
      for (let quoteLen of [4, 3]) {
        if (symbol.length > quoteLen) {
          const base = symbol.slice(0, -quoteLen)
          const quote = symbol.slice(-quoteLen)
          const pair = `${base}/${quote}`
          return marketType === 'futures' ? `${pair}:${quote}` : pair
        }
      }
    }
    
    // Если ничего не подошло, возвращаем как есть
    return symbol
  }
} 