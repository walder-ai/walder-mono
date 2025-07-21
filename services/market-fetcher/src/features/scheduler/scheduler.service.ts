import { MarketService } from '../market'

export class SchedulerService {
  private intervalId?: NodeJS.Timeout
  private readonly FETCH_INTERVAL = 10000
  private isProcessing = false

  constructor(private marketService: MarketService) {}

  start(): void {
    // Initial fetch with delay to let HTTP server settle
    setTimeout(() => {
      this.fetchDataImmediate()
    }, 5000)
    
    this.schedulePeriodicFetching()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  private async fetchDataImmediate(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    try {
      await this.marketService.fetchAndStoreData()
    } catch (error) {
      console.error('❌ Initial fetch failed:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private schedulePeriodicFetching(): void {
    this.intervalId = setInterval(async () => {
      if (this.isProcessing) {
        console.log('⏳ Skipping fetch - previous still running')
        return
      }
      
      this.isProcessing = true
      try {
        await this.marketService.fetchAndStoreData()
      } catch (error) {
        console.error('❌ Periodic fetch failed:', error)
      } finally {
        this.isProcessing = false
      }
    }, this.FETCH_INTERVAL)
  }
}
