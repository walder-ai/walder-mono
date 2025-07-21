import { Elysia } from 'elysia'
import { MarketService } from './features/market'
import { SchedulerService } from './features/scheduler'
import { RedisCacheService } from './shared/cache'
import { config } from './config'
import { HealthChecker } from '../../../shared/health'

const SERVICE_CONFIG = {
  name: 'market-fetcher',
  version: '2.0.0',
  features: ['auto-scaling', 'zero-downtime', 'instant-rollback', 'gitops-powered', 'fully-automated']
}

export class App {
  private app: Elysia
  private schedulerService: SchedulerService
  private cacheService: RedisCacheService
  private marketService: MarketService
  private healthChecker: HealthChecker

  constructor() {
    this.cacheService = new RedisCacheService()
    this.marketService = new MarketService(this.cacheService)
    this.schedulerService = new SchedulerService(this.marketService)
    
    this.healthChecker = new HealthChecker({
      service: SERVICE_CONFIG.name,
      version: SERVICE_CONFIG.version,
      features: SERVICE_CONFIG.features,
      checkDependencies: async () => ({
        redis: this.cacheService.getConnectionStatus() ? 'connected' : 'disconnected'
      })
    })
    
    this.app = new Elysia()
      .get('/health', this.healthChecker.createHandler())
      .get('/', () => ({ 
        message: `🤖 AUTOMATION ENGINE v${SERVICE_CONFIG.version} - Fully Automated!`, 
        service: SERVICE_CONFIG.name,
        features: SERVICE_CONFIG.features,
        status: 'automated',
        timestamp: new Date().toISOString(),
        deployment: 'GitOps Fully Automated',
        rollback: 'instant-available'
      }))
      .get('/api/status', () => ({
        service: SERVICE_CONFIG.name,
        version: SERVICE_CONFIG.version,
        uptime: process.uptime(),
        cache_status: this.cacheService.getConnectionStatus() ? 'connected' : 'disconnected',
        environment: 'production',
        automation: 'COMPLETE'
      }))
  }

  async start(): Promise<void> {
    // Start HTTP server first - listen on all interfaces for Docker/K8s
    this.app.listen({
      port: config.port,
      hostname: '0.0.0.0'
    })
    console.log(`🤖 Automation Engine v${SERVICE_CONFIG.version} - ZERO TOUCH DEPLOYMENT!`)
    console.log(`⚡ Full GitOps: git → build → deploy → rollback ready`)
    console.log(`🎯 Features: ${SERVICE_CONFIG.features.join(' | ')}`)
    console.log(`🚀 AUTOMATION COMPLETE!`)
    
    // Start background tasks after server is ready
    setTimeout(() => {
      this.schedulerService.start()
    }, 5000)

    this.setupGracefulShutdown()
  }

  async stop(): Promise<void> {
    this.schedulerService.stop()
    await this.cacheService.disconnect()
    
    console.log('Application stopped gracefully')
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      await this.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }
}
