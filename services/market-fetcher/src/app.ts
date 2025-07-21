import { Elysia } from 'elysia'
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

    this.app = new Elysia()
      .get('/health', () => ({
        status: 'healthy',
        service: config.service.name,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        message: `📈 ${config.service.name} v1.0.0`,
        uptime: process.uptime(),
        environment: config.service.environment,
        logLevel: config.service.logLevel,
        features: ['market-data', 'ccxt', 'redis-timeseries', 'env-config'],
        config: {
          exchange: config.exchange.name,
          spotEnabled: config.market.spot.enabled,
          futuresEnabled: config.market.futures.enabled,
          schedulerEnabled: config.scheduler.enabled,
          schedulerInterval: config.scheduler.interval,
          redisUrl: config.redis.url ? '***configured***' : 'not set'
        }
      }))
      .get('/', () => ({
        service: config.service.name,
        version: '1.0.0',
        endpoints: ['/health', '/config', '/api/market/data'],
        environment: config.service.environment
      }))
      .get('/config', () => ({
        service: config.service,
        exchange: config.exchange,
        market: {
          allSymbols: config.market.allSymbols,
          activeOnly: config.market.activeOnly,
          spot: config.market.spot,
          futures: config.market.futures
        },
        scheduler: config.scheduler,
        // Don't expose sensitive data
        redis: {
          url: config.redis.url ? '***configured***' : 'not set'
        }
      }))
      .get('/api/market/data', async () => {
        return await this.marketService.getLatestData('spot')
      })
  }

  async start() {
    // Only start scheduler if enabled
    if (config.scheduler.enabled) {
      this.schedulerService.start()
      console.log(`⏰ Scheduler enabled: ${config.scheduler.interval}ms interval`)
    } else {
      console.log('⏸️  Scheduler disabled')
    }
    
    this.app.listen({ port: config.service.port })
    
    console.log(`📈 ${config.service.name} v1.0.0`)
    console.log(`🚀 Server running: http://localhost:${config.service.port}`)
    console.log(`🌍 Environment: ${config.service.environment}`)
    console.log(`📊 Log Level: ${config.service.logLevel}`)
    console.log(`📊 Exchange: ${config.exchange.name}`)
    console.log(`💹 Spot: ${config.market.spot.enabled ? 'enabled' : 'disabled'}`)
    console.log(`🔮 Futures: ${config.market.futures.enabled ? 'enabled' : 'disabled'}`)
    
    if (config.market.spot.enabled) {
      console.log(`📊 Spot symbols: ${config.market.spot.symbols.join(', ')}`)
    }
    if (config.market.futures.enabled) {
      console.log(`🔮 Futures symbols: ${config.market.futures.symbols.join(', ')}`)
    }
  }

  async stop() {
    this.schedulerService.stop()
    await this.cacheService.disconnect()
  }
}
