import { ExchangeProvider, MarketService as IMarketService, CacheService } from '../../shared/interfaces'
import { SpotExchangeProvider, FuturesExchangeProvider } from '../../shared/exchange'
import { TickerTransformer } from '../../utils/ticker-transformer'
import { config } from '../../config'
import { RedisCacheService } from '../../shared/cache'

export class MarketService implements IMarketService {
  private spotProvider: ExchangeProvider
  private futuresProvider: ExchangeProvider

  constructor(private cacheService: CacheService) {
    this.spotProvider = new SpotExchangeProvider()
    this.futuresProvider = new FuturesExchangeProvider()
  }

  getType(): 'spot' | 'futures' {
    throw new Error('Use specific market type methods')
  }

  async fetchAndStoreData(marketType?: 'spot' | 'futures'): Promise<void> {
    // Process sequentially to avoid overwhelming the system
    if (!marketType || marketType === 'spot') {
      if (config.market.spot.enabled) {
        await this.processMarketData('spot', this.spotProvider)
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!marketType || marketType === 'futures') {
      if (config.market.futures.enabled) {
        await this.processMarketData('futures', this.futuresProvider)
      }
    }
  }

  async getLatestData(marketType: 'spot' | 'futures'): Promise<Record<string, any>> {
    // Cast to RedisCacheService to access the specialized method
    if (this.cacheService instanceof RedisCacheService) {
      return await this.cacheService.getMarketData(marketType)
    }
    
    // Fallback for interface compatibility
    return await this.cacheService.getMultiple([`${marketType}:*`])
  }

  private async processMarketData(
    marketType: 'spot' | 'futures', 
    provider: ExchangeProvider
  ): Promise<void> {
    try {
      const tickers = await provider.fetchFilteredTickers()
      const transformedData = TickerTransformer.transformMultiple(tickers)
      
      await this.cacheService.setMultiple(marketType, transformedData)
      console.log(`✅ ${marketType} data updated: ${Object.keys(transformedData).length} symbols`)
    } catch (error) {
      console.error(`❌ Error updating ${marketType} data:`, error)
    }
  }
}
