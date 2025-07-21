import { Elysia } from 'elysia'
import { MarketService } from './features/market'
import { SchedulerService } from './features/scheduler'
import { RedisCacheService } from './shared/cache'
import { config } from './config'
import { HealthChecker } from '../../../shared/health'

const SERVICE_CONFIG = {
  name: 'market-fetcher',
  version: '1.5.0',
  features: ['hypersonic-data', 'quantum-caching', 'ai-scheduling', 'omni-exchange', 'neural-streams', 'time-prediction']
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
        message: `🚀 Hypersonic Market Engine v${SERVICE_CONFIG.version} - Time Traveler Mode!`, 
        service: SERVICE_CONFIG.name,
        features: SERVICE_CONFIG.features,
        status: 'hypersonic',
        timestamp: new Date().toISOString(),
        deployment: 'GitOps with FluxCD',
        performance: 'time-bending',
        dimension: '4D-trading'
      }))
      .get('/api/status', () => ({
        service: SERVICE_CONFIG.name,
        version: SERVICE_CONFIG.version,
        uptime: process.uptime(),
        cache_status: this.cacheService.getConnectionStatus() ? 'connected' : 'disconnected',
        environment: 'production',
        speed: 'hypersonic',
        temporal_state: 'synchronized'
      }))
  }

  async start(): Promise<void> {
    // Start HTTP server first - listen on all interfaces for Docker/K8s
    this.app.listen({
      port: config.port,
      hostname: '0.0.0.0'
    })
    console.log(`🚀 Hypersonic Market Fetcher v${SERVICE_CONFIG.version} - Time Traveler Active!`)
    console.log(`⚡ Quantum Pipeline: git → Actions → GHCR → FluxCD → K8s`)
    console.log(`🧠 Neural Features: ${SERVICE_CONFIG.features.join(' | ')}`)
    console.log(`🌟 GitOps Test: Everything is Working Perfectly!`)
    
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
