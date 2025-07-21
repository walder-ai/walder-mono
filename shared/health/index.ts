export interface HealthInfo {
  status: 'ok' | 'error'
  service: string
  version: string
  features?: string[]
  uptime?: number
  timestamp?: string
  environment?: string
  dependencies?: Record<string, 'connected' | 'disconnected' | 'unknown'>
  // Enhanced health response format v1.2
}

export interface HealthCheckConfig {
  service: string
  version: string
  features?: string[]
  checkDependencies?: () => Promise<Record<string, 'connected' | 'disconnected' | 'unknown'>>
}

export class HealthChecker {
  private config: HealthCheckConfig
  private startTime: number

  constructor(config: HealthCheckConfig) {
    this.config = config
    this.startTime = Date.now()
  }

  async getHealthInfo(): Promise<HealthInfo> {
    const uptime = (Date.now() - this.startTime) / 1000

    let dependencies: Record<string, 'connected' | 'disconnected' | 'unknown'> | undefined
    if (this.config.checkDependencies) {
      try {
        dependencies = await this.config.checkDependencies()
      } catch (error) {
        console.error('Health check dependencies error:', error)
        dependencies = {}
      }
    }

    const hasFailedDependencies = dependencies && Object.values(dependencies).some(status => status === 'disconnected')

    return {
      status: hasFailedDependencies ? 'error' : 'ok',
      service: this.config.service,
      version: this.config.version,
      features: this.config.features,
      uptime,
      timestamp: new Date().toISOString(),
      dependencies
    }
  }

  createHandler() {
    return async () => {
      try {
        return await this.getHealthInfo()
      } catch (error) {
        console.error('Health check error:', error)
        return {
          status: 'error' as const,
          service: this.config.service,
          version: this.config.version,
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        }
      }
    }
  }
} 