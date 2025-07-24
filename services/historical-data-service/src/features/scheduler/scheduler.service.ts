import { HistoricalDataService } from '../historical'
import { config } from '../../config'

export class SchedulerService {
  private updateIntervalId: NodeJS.Timeout | null = null
  private backfillIntervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private isBackfillRunning = false
  private failedSymbols = new Map<string, number>() // symbol -> failed attempts

  constructor(private historicalService: HistoricalDataService) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running')
      return
    }

    console.log('🚀 Starting scheduler...')
    
    if (config.historical.backfillFirst) {
      console.log('📊 Starting initial backfill - updates will start after completion')
      await this.completeBackfillFirst()
    }
    
    this.startUpdateScheduler()
    this.startBackfillScheduler()
    
    this.isRunning = true
    console.log('✅ Scheduler started successfully')
  }

  stop(): void {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId)
      this.updateIntervalId = null
    }
    
    if (this.backfillIntervalId) {
      clearInterval(this.backfillIntervalId)
      this.backfillIntervalId = null
    }
    
    this.isRunning = false
    this.isBackfillRunning = false
  }

  async runBackfillOnce(): Promise<void> {
    if (this.isBackfillRunning) {
      return
    }

    this.isBackfillRunning = true
    
    try {
      await this.processBackfill()
    } finally {
      this.isBackfillRunning = false
    }
  }

  async runUpdateOnce(): Promise<void> {
    await this.processUpdates()
  }

  getStatus(): { 
    running: boolean
    backfillRunning: boolean
    updateInterval: number
    backfillInterval: number
  } {
    return {
      running: this.isRunning,
      backfillRunning: this.isBackfillRunning,
      updateInterval: 5 * 60 * 1000, // Synchronized with 5-minute candles
      backfillInterval: config.scheduler.backfillInterval
    }
  }

  private startUpdateScheduler(): void {
    console.log('🔄 Starting update scheduler...')
    
    // Calculate time until next 5-minute boundary + 30 seconds
    const now = new Date()
    const currentMinutes = now.getMinutes()
    const currentSeconds = now.getSeconds()
    
    // Find next 5-minute boundary (0, 5, 10, 15, ...)
    const nextBoundary = Math.ceil(currentMinutes / 5) * 5
    const minutesToWait = (nextBoundary - currentMinutes) % 60
    const secondsToWait = 60 - currentSeconds
    
    // Wait until boundary + 5 seconds for candle to close and form
    const msToWait = (minutesToWait * 60 + secondsToWait + 5) * 1000
    
    console.log(`⏰ Next update in ${Math.round(msToWait/1000)}s (at ${new Date(Date.now() + msToWait).toLocaleTimeString()})`)
    
    setTimeout(() => {
      this.processUpdates()
      
      // Then run every 5 minutes exactly
      this.updateIntervalId = setInterval(() => {
        this.processUpdates()
      }, 5 * 60 * 1000)
      
      console.log(`✅ Update scheduler synchronized with 5-minute candles`)
    }, msToWait)
  }

  private startBackfillScheduler(): void {
    console.log('📊 Starting backfill scheduler (first run in 5s)...')
    setTimeout(() => {
      this.processBackfill()
    }, 5000)

    this.backfillIntervalId = setInterval(() => {
      if (!this.isBackfillRunning) {
        this.processBackfill()
      }
    }, config.scheduler.backfillInterval)
    console.log(`✅ Backfill scheduler running (interval: ${config.scheduler.backfillInterval}ms)`)
  }

    private async processUpdates(): Promise<void> {
    try {
      console.log('🔄 Processing updates...')
      const symbols: string[] = []

      if (config.market.spot.enabled) {
        const spotSymbols = await this.historicalService.getSpotSymbols()
        symbols.push(...spotSymbols.map(s => `spot:${s}`))
        console.log(`📈 Found ${spotSymbols.length} spot symbols`)
      }

      if (config.market.futures.enabled) {
        const futuresSymbols = await this.historicalService.getFuturesSymbols()
        symbols.push(...futuresSymbols.map(s => `futures:${s}`))
        console.log(`🔮 Found ${futuresSymbols.length} futures symbols`)
      }

      console.log(`🎯 Processing ${symbols.length} total symbols for updates`)

      for (const symbolWithType of symbols) {
        const [marketType, symbol] = symbolWithType.split(':')
        
        try {
          await this.historicalService.updateSymbol(symbol, marketType as 'spot' | 'futures')
          console.log(`✅ Updated ${marketType}:${symbol}`)
          await this.delay(config.exchange.requestDelay)
        } catch (error) {
          console.log(`❌ Failed to update ${marketType}:${symbol}:`, error)
          continue
        }
      }
      console.log('✅ Updates processing completed')
    } catch (error) {
      console.error('❌ Error in processUpdates:', error)
    }
  }

  private async processBackfill(): Promise<void> {
    if (this.isBackfillRunning) {
      console.log('⏳ Backfill already running, skipping...')
      return
    }
    
    this.isBackfillRunning = true
    console.log('📊 Starting backfill process...')

    try {
      const progress = await this.historicalService.getAllSymbolsProgress()
      
      const incompleteSymbols = Object.entries(progress)
        .filter(([_, prog]) => !prog.isComplete)
        .map(([symbolWithType]) => symbolWithType)

      console.log(`🎯 Found ${incompleteSymbols.length} incomplete symbols for backfill`)

      for (const symbolWithType of incompleteSymbols) {
        if (!this.isBackfillRunning) break

        const [marketType, symbol] = symbolWithType.split(':')
        
        try {
          console.log(`📊 Backfilling ${marketType}:${symbol}...`)
          await this.historicalService.backfillSymbol(symbol, marketType as 'spot' | 'futures')
          console.log(`✅ Backfilled ${marketType}:${symbol}`)
          await this.delay(config.exchange.requestDelay * 3)
        } catch (error) {
          console.log(`❌ Failed to backfill ${marketType}:${symbol}:`, error)
          await this.delay(config.historical.retryDelay)
          continue
        }
      }
      console.log('✅ Backfill process completed')
    } catch (error) {
      console.error('❌ Error in processBackfill:', error)
    } finally {
      this.isBackfillRunning = false
    }
  }

  private async completeBackfillFirst(): Promise<void> {
    let allComplete = false
    let attempt = 0
    
    while (!allComplete && attempt < 100) {
      attempt++
      console.log(`📊 Backfill attempt ${attempt}/100...`)
      
      const progress = await this.historicalService.getAllSymbolsProgress()
      const incompleteSymbols = Object.entries(progress)
        .filter(([symbolWithType, prog]) => {
          if (prog.isComplete) return false
          
          // Skip symbols that failed too many times
          const failedCount = this.failedSymbols.get(symbolWithType) || 0
          if (failedCount >= 5) {
            console.log(`⏭️  Skipping ${symbolWithType} (failed ${failedCount} times)`)
            return false
          }
          
          return true
        })
        .map(([symbolWithType]) => symbolWithType)

      console.log(`🎯 Found ${incompleteSymbols.length} incomplete symbols`)

      if (incompleteSymbols.length === 0) {
        allComplete = true
        console.log('✅ All symbols backfilled successfully!')
        break
      }

      for (const symbolWithType of incompleteSymbols) {
        const [marketType, symbol] = symbolWithType.split(':')
        
        try {
          console.log(`📊 Backfilling ${marketType}:${symbol}...`)
          await this.historicalService.backfillSymbol(symbol, marketType as 'spot' | 'futures')
          console.log(`✅ Backfilled ${marketType}:${symbol}`)
          
          // Reset failed count on success
          this.failedSymbols.delete(symbolWithType)
          await this.delay(config.exchange.requestDelay * 2)
        } catch (error) {
          // Increment failed count
          const currentFailed = this.failedSymbols.get(symbolWithType) || 0
          this.failedSymbols.set(symbolWithType, currentFailed + 1)
          
          console.log(`❌ Failed to backfill ${marketType}:${symbol} (attempt ${currentFailed + 1}/5)`)
          await this.delay(config.historical.retryDelay)
          continue
        }
      }
      
      if (incompleteSymbols.length > 0) {
        console.log(`⏳ Waiting 10s before next backfill attempt...`)
        await this.delay(10000)
      }
    }
    
    if (!allComplete) {
      console.log('⚠️  Max backfill attempts reached, starting updates anyway')
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 