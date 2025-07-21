import { Elysia, t } from 'elysia'
import { MarketService } from './features/market'
import { SchedulerService } from './features/scheduler'
import { RedisCacheService } from './shared/cache'
import { config } from './config'

export class App {
  private app: Elysia
  private cacheService: RedisCacheService
  private marketService: MarketService
  private schedulerService: SchedulerService

  constructor() {
    this.cacheService = new RedisCacheService()
    this.marketService = new MarketService(this.cacheService)
    this.schedulerService = new SchedulerService(this.marketService)

    this.app = new Elysia({
      // Elysia best practice optimizations
      aot: config.service.environment === 'production',
      precompile: config.service.environment === 'production',
      nativeStaticResponse: true,
      normalize: true,
      name: config.service.name,
      tags: ['market-data', 'crypto']
    })
      .get('/health', () => ({
        status: 'healthy' as const,
        service: config.service.name,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }), {
        response: t.Object({
          status: t.Literal('healthy'),
          service: t.String(),
          version: t.String(),
          timestamp: t.String(),
          uptime: t.Number()
        })
      })
  }

  async start() {
    if (config.scheduler.enabled) {
      this.schedulerService.start()
      console.log(`⏰ Scheduler enabled: ${config.scheduler.interval}ms`)
    }
    
    this.app.listen({ port: config.service.port })
    
    console.log(`📈 ${config.service.name} v1.0.0`)
    console.log(`🚀 Server: http://localhost:${config.service.port}`)
    console.log(`🌍 Environment: ${config.service.environment}`)
    console.log(`📊 Exchange: ${config.exchange.name}`)
    console.log(`💹 Spot: ${config.market.spot.enabled ? 'enabled' : 'disabled'}`)
    console.log(`🔮 Futures: ${config.market.futures.enabled ? 'enabled' : 'disabled'}`)
  }

  async stop() {
    this.schedulerService.stop()
    await this.cacheService.disconnect()
  }
}
