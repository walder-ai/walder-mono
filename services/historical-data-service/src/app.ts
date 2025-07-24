import { Elysia, t } from 'elysia'
import { HistoricalDataService } from './features/historical'
import { SchedulerService } from './features/scheduler'
import { RedisTimeSeriesService } from './shared/cache'
import { config } from './config'

export class App {
  private app: Elysia
  private timeSeriesService: RedisTimeSeriesService
  private historicalService: HistoricalDataService
  private schedulerService: SchedulerService

  constructor() {
    this.timeSeriesService = new RedisTimeSeriesService()
    this.historicalService = new HistoricalDataService()
    this.schedulerService = new SchedulerService(this.historicalService)

    this.app = new Elysia({
      aot: config.service.environment === 'production',
      precompile: config.service.environment === 'production',
      nativeStaticResponse: true,
      normalize: true,
      name: config.service.name,
      tags: ['historical-data', 'timeseries', 'crypto']
    })
      .get('/health', () => ({
        status: 'healthy' as const,
        service: config.service.name,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        scheduler: this.schedulerService.getStatus()
      }), {
        response: t.Object({
          status: t.Literal('healthy'),
          service: t.String(),
          version: t.String(),
          timestamp: t.String(),
          uptime: t.Number(),
          scheduler: t.Object({
            running: t.Boolean(),
            backfillRunning: t.Boolean(),
            updateInterval: t.Number(),
            backfillInterval: t.Number()
          })
        })
      })
      .get('/status', () => ({
        scheduler: this.schedulerService.getStatus(),
        config: {
          exchange: config.exchange.name,
          timeframe: config.historical.timeframe,
          startDate: config.historical.startDate,
          spot: config.market.spot.enabled,
          futures: config.market.futures.enabled
        }
      }))
      .get('/progress', async () => {
        return await this.historicalService.getAllSymbolsProgress()
      })
      .get('/progress/:marketType/:symbol', async ({ params: { marketType, symbol } }) => {
        if (marketType !== 'spot' && marketType !== 'futures') {
          throw new Error('Invalid market type')
        }
        
        const progress = await this.historicalService.getProgress(symbol, marketType)
        const startDate = new Date(config.historical.startDate)
        const now = new Date()
        
        if (progress.lastTimestamp) {
          const totalRange = now.getTime() - startDate.getTime()
          const completedRange = progress.lastTimestamp - startDate.getTime()
          const percentage = Math.min(100, (completedRange / totalRange) * 100)
          
          return {
            symbol,
            marketType,
            startDate: startDate.toISOString(),
            lastTimestamp: new Date(progress.lastTimestamp).toISOString(),
            isComplete: progress.isComplete,
            percentage: Math.round(percentage * 100) / 100,
            remainingDays: Math.ceil((now.getTime() - progress.lastTimestamp) / (24 * 60 * 60 * 1000))
          }
        }
        
        return {
          symbol,
          marketType,
          startDate: startDate.toISOString(),
          lastTimestamp: null,
          isComplete: false,
          percentage: 0,
          remainingDays: Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
        }
      }, {
        params: t.Object({
          marketType: t.Union([t.Literal('spot'), t.Literal('futures')]),
          symbol: t.String()
        })
      })
      .post('/backfill/:marketType/:symbol', async ({ params: { marketType, symbol } }) => {
        if (marketType !== 'spot' && marketType !== 'futures') {
          throw new Error('Invalid market type')
        }
        
        await this.historicalService.backfillSymbol(symbol, marketType)
        return { success: true, symbol, marketType }
      }, {
        params: t.Object({
          marketType: t.Union([t.Literal('spot'), t.Literal('futures')]),
          symbol: t.String()
        })
      })
      .post('/update/:marketType/:symbol', async ({ params: { marketType, symbol } }) => {
        if (marketType !== 'spot' && marketType !== 'futures') {
          throw new Error('Invalid market type')
        }
        
        await this.historicalService.updateSymbol(symbol, marketType)
        return { success: true, symbol, marketType }
      }, {
        params: t.Object({
          marketType: t.Union([t.Literal('spot'), t.Literal('futures')]),
          symbol: t.String()
        })
      })
      .post('/scheduler/backfill', async () => {
        await this.schedulerService.runBackfillOnce()
        return { success: true, action: 'backfill_started' }
      })
      .post('/scheduler/update', async () => {
        await this.schedulerService.runUpdateOnce()
        return { success: true, action: 'update_completed' }
      })
  }

  async start() {
    // Start HTTP server first for health checks
    this.app.listen({ port: config.service.port })
    
    if (config.scheduler.enabled) {
      // Start scheduler in background (non-blocking)
      this.schedulerService.start().catch(console.error)
    }
    
    console.log(`📊 ${config.service.name} v1.0.0`)
    console.log(`🚀 Server: http://localhost:${config.service.port}`)
    console.log(`🌍 Environment: ${config.service.environment}`)
    console.log(`📈 Exchange: ${config.exchange.name}`)
    console.log(`⏰ Timeframe: ${config.historical.timeframe}`)
    console.log(`📅 Start Date: ${config.historical.startDate}`)
    console.log(`💹 Spot: ${config.market.spot.enabled ? 'enabled' : 'disabled'}`)
    console.log(`🔮 Futures: ${config.market.futures.enabled ? 'enabled' : 'disabled'}`)
    console.log(`🗂️  Key Prefix: ${config.redis.keyPrefix}`)
    if (config.scheduler.enabled) {
      console.log(`⏰ Scheduler: enabled (update: ${config.scheduler.interval}ms, backfill: ${config.scheduler.backfillInterval}ms)`)
    }
  }

  async stop() {
    this.schedulerService.stop()
    await this.timeSeriesService.disconnect()
  }
} 