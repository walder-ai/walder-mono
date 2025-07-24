import { HistoricalService, ExchangeProvider, TimeSeriesService, OHLCVData } from '../../shared/interfaces'
import { SpotExchangeProvider, FuturesExchangeProvider } from '../../shared/exchange'
import { RedisTimeSeriesService } from '../../shared/cache'
import { SymbolNormalizer } from '../../utils/symbol-normalizer'
import { config } from '../../config'

export class HistoricalDataService implements HistoricalService {
  private spotProvider: ExchangeProvider
  private futuresProvider: ExchangeProvider
  private timeSeriesService: TimeSeriesService

  constructor() {
    this.spotProvider = new SpotExchangeProvider()
    this.futuresProvider = new FuturesExchangeProvider()
    this.timeSeriesService = new RedisTimeSeriesService()
  }

  private async findTokenListingDate(symbol: string, marketType: 'spot' | 'futures'): Promise<Date> {
    const provider = marketType === 'spot' ? this.spotProvider : this.futuresProvider
    const normalizedSymbol = SymbolNormalizer.normalize(symbol)
    const denormalizedSymbol = SymbolNormalizer.denormalize(normalizedSymbol, marketType)
    
    const configStartDate = new Date(config.historical.startDate)
    const now = new Date()
    let searchDate = new Date(configStartDate)
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    
    while (searchDate < now) {
      try {
        const since = searchDate.getTime()
        const data = await provider.fetchOHLCV(denormalizedSymbol, config.historical.timeframe, since, 10)
        
        if (data.length > 0) {
          return new Date(data[0].timestamp)
        }
        
        searchDate.setTime(searchDate.getTime() + oneWeek)
        await this.delay(200)
        
      } catch (error) {
        searchDate.setTime(searchDate.getTime() + oneWeek)
      }
    }
    
    return configStartDate
  }

  async backfillSymbol(symbol: string, marketType: 'spot' | 'futures'): Promise<void> {
    const normalizedSymbol = SymbolNormalizer.normalize(symbol)
    const progress = await this.getProgress(symbol, marketType)
    
    if (progress.isComplete) {
      return
    }
    
    const provider = marketType === 'spot' ? this.spotProvider : this.futuresProvider
    const denormalizedSymbol = SymbolNormalizer.denormalize(normalizedSymbol, marketType)
    
    let startDate: Date
    if (progress.lastTimestamp) {
      startDate = new Date(progress.lastTimestamp + (5 * 60 * 1000))
    } else {
      startDate = await this.findTokenListingDate(symbol, marketType)
    }
    
    const now = new Date()
    const batchSize = config.historical.batchSize
    let currentDate = startDate
    let requestCount = 0
    const totalRange = now.getTime() - startDate.getTime()

    while (currentDate < now) {
      try {
        const since = currentDate.getTime()
        requestCount++
        
        const data = await provider.fetchOHLCV(denormalizedSymbol, config.historical.timeframe, since, batchSize)
        
        if (data.length === 0) {
          currentDate.setHours(currentDate.getHours() + 4)
          continue
        }

        const keyPrefix = this.buildKeyPrefix(normalizedSymbol, marketType)
        await this.timeSeriesService.addBulkData(keyPrefix, data)
        
        const lastCandle = data[data.length - 1]
        currentDate = new Date(lastCandle.timestamp + (5 * 60 * 1000))
        
        // Log progress every 10 requests
        if (requestCount % 10 === 0) {
          const completedRange = currentDate.getTime() - startDate.getTime()
          const percentage = Math.min(100, (completedRange / totalRange) * 100)
          console.log(`📅 ${normalizedSymbol}: ${currentDate.toISOString().split('T')[0]} (${percentage.toFixed(1)}%)`)
        }
        
        await this.delay(config.exchange.requestDelay * 2)
        
      } catch (error) {
        await this.retryWithBackoff(async () => {
          const since = currentDate.getTime()
          const data = await provider.fetchOHLCV(denormalizedSymbol, config.historical.timeframe, since, batchSize)
          
          if (data.length > 0) {
            const keyPrefix = this.buildKeyPrefix(normalizedSymbol, marketType)
            await this.timeSeriesService.addBulkData(keyPrefix, data)
            
            const lastCandle = data[data.length - 1]
            currentDate = new Date(lastCandle.timestamp + (5 * 60 * 1000))
          } else {
            currentDate.setHours(currentDate.getHours() + 4)
          }
        })
      }
    }
  }

  async updateSymbol(symbol: string, marketType: 'spot' | 'futures'): Promise<void> {
    const provider = marketType === 'spot' ? this.spotProvider : this.futuresProvider
    const normalizedSymbol = SymbolNormalizer.normalize(symbol)
    const denormalizedSymbol = SymbolNormalizer.denormalize(normalizedSymbol, marketType)
    
    const keyPrefix = this.buildKeyPrefix(normalizedSymbol, marketType)
    const lastTimestamp = await this.timeSeriesService.getLastTimestamp(keyPrefix)
    const since = lastTimestamp ? lastTimestamp + (5 * 60 * 1000) : Date.now() - (24 * 60 * 60 * 1000)
    
    try {
      const data = await provider.fetchOHLCV(denormalizedSymbol, config.historical.timeframe, since)
      
      if (data.length > 0) {
        await this.timeSeriesService.addBulkData(keyPrefix, data)
      }
    } catch (error) {
      await this.retryWithBackoff(async () => {
        const data = await provider.fetchOHLCV(denormalizedSymbol, config.historical.timeframe, since)
        
        if (data.length > 0) {
          await this.timeSeriesService.addBulkData(keyPrefix, data)
        }
      })
    }
  }

  async getProgress(symbol: string, marketType: 'spot' | 'futures'): Promise<{ lastTimestamp: number | null; isComplete: boolean }> {
    const normalizedSymbol = SymbolNormalizer.normalize(symbol)
    const keyPrefix = this.buildKeyPrefix(normalizedSymbol, marketType)
    const tsInfo = await (this.timeSeriesService as any).getTimeSeriesInfo(keyPrefix)
    
    if (!tsInfo.exists || !tsInfo.lastTimestamp) {
      return { lastTimestamp: null, isComplete: false }
    }
    
    const startTimestamp = new Date(config.historical.startDate).getTime()
    const isComplete = this.validateDataCompleteness(tsInfo, startTimestamp, Date.now(), normalizedSymbol)
    
    return {
      lastTimestamp: tsInfo.lastTimestamp,
      isComplete
    }
  }

  private validateDataCompleteness(
    tsInfo: { totalSamples: number | null; firstTimestamp: number | null; lastTimestamp: number | null }, 
    startTimestamp: number, 
    currentTime: number,
    symbol?: string
  ): boolean {
    if (!tsInfo.totalSamples || !tsInfo.firstTimestamp || !tsInfo.lastTimestamp) {
      if (symbol) console.log(`❌ ${symbol}: Missing basic data (samples: ${tsInfo.totalSamples}, first: ${tsInfo.firstTimestamp}, last: ${tsInfo.lastTimestamp})`)
      return false
    }

    if (tsInfo.totalSamples < 100) {
      if (symbol) console.log(`❌ ${symbol}: Too few samples (${tsInfo.totalSamples} < 100)`)
      return false
    }

    // Data must be recent (within last 2 hours for real-time completion)
    const maxAge = 2 * 60 * 60 * 1000
    if (tsInfo.lastTimestamp < currentTime - maxAge) {
      const ageHours = Math.round((currentTime - tsInfo.lastTimestamp) / (60 * 60 * 1000))
      if (symbol) console.log(`❌ ${symbol}: Data too old (${ageHours}h ago)`)
      return false
    }

    // Must have reasonable coverage from token listing date (not config date)
    const tokenListingDate = tsInfo.firstTimestamp // Use actual first data as listing date
    const expectedRangeFromListing = currentTime - tokenListingDate
    const actualRange = tsInfo.lastTimestamp - tsInfo.firstTimestamp
    
    // Should cover at least 90% from listing date to now
    if (actualRange < expectedRangeFromListing * 0.9) {
      const coverage = ((actualRange / expectedRangeFromListing) * 100).toFixed(1)
      if (symbol) console.log(`❌ ${symbol}: Insufficient coverage from listing (${coverage}% < 90%)`)
      return false
    }

    const expectedCandles = Math.floor(actualRange / (5 * 60 * 1000))
    const actualDensity = tsInfo.totalSamples / expectedCandles
    if (actualDensity < 0.7) {
      const density = (actualDensity * 100).toFixed(1)
      if (symbol) console.log(`❌ ${symbol}: Low density (${density}% < 70%)`)
      return false
    }

    if (symbol) console.log(`✅ ${symbol}: Complete (${tsInfo.totalSamples} samples, ${((actualDensity * 100).toFixed(1))}% density)`)
    return true
  }

  async getAllSymbolsProgress(): Promise<Record<string, { lastTimestamp: number | null; isComplete: boolean }>> {
    const progress: Record<string, { lastTimestamp: number | null; isComplete: boolean }> = {}
    
    if (config.market.spot.enabled) {
      const spotSymbols = await this.spotProvider.fetchFilteredSymbols()
      for (const symbol of spotSymbols) {
        const normalizedSymbol = SymbolNormalizer.normalize(symbol)
        progress[`spot:${normalizedSymbol}`] = await this.getProgress(symbol, 'spot')
      }
    }
    
    if (config.market.futures.enabled) {
      const futuresSymbols = await this.futuresProvider.fetchFilteredSymbols()
      for (const symbol of futuresSymbols) {
        const normalizedSymbol = SymbolNormalizer.normalize(symbol)
        progress[`futures:${normalizedSymbol}`] = await this.getProgress(symbol, 'futures')
      }
    }
    
    return progress
  }

  async getSpotSymbols(): Promise<string[]> {
    return await this.spotProvider.fetchFilteredSymbols()
  }

  async getFuturesSymbols(): Promise<string[]> {
    return await this.futuresProvider.fetchFilteredSymbols()
  }

  private buildKeyPrefix(symbol: string, marketType: 'spot' | 'futures'): string {
    return `data:${config.exchange.name}:${marketType}:${symbol}:5m`
  }

  private async retryWithBackoff(operation: () => Promise<void>): Promise<void> {
    let attempt = 0
    const maxAttempts = config.historical.retryAttempts
    
    while (attempt < maxAttempts) {
      try {
        await operation()
        return
      } catch (error) {
        attempt++
        
        if (attempt >= maxAttempts) {
          throw error
        }
        
        const backoffTime = config.historical.retryDelay * Math.pow(2, attempt - 1)
        await this.delay(backoffTime)
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 