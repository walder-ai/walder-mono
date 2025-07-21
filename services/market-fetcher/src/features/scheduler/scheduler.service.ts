import { MarketService } from '../market'
import { config } from '../../config'

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(private marketService: MarketService) {}

  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running')
      return
    }

    console.log(`⏰ Starting scheduler with ${config.scheduler.interval}ms interval`)
    
    // Start immediately
    this.fetchData()
    
    // Then schedule regular intervals
    this.intervalId = setInterval(() => {
      this.fetchData()
    }, config.scheduler.interval)
    
    this.isRunning = true
    console.log('✅ Scheduler started')
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('🛑 Scheduler stopped')
  }

  getStatus(): { running: boolean; interval: number } {
    return {
      running: this.isRunning,
      interval: config.scheduler.interval
    }
  }

  private async fetchData(): Promise<void> {
    try {
      console.log('🔄 Fetching market data...')
      await this.marketService.fetchAndStoreData()
      console.log('✅ Market data updated')
    } catch (error) {
      console.error('❌ Error fetching market data:', error)
    }
  }
}
