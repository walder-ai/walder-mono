import { Elysia } from 'elysia'

const SERVICE_CONFIG = {
  name: process.env.SERVICE_NAME || 'analytics-service',
  version: '1.0.0',
  port: parseInt(process.env.PORT || '3001'),
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  features: ['data-analysis', 'reporting', 'configurable-env']
}

const app = new Elysia()
  .get('/health', () => ({
    status: 'healthy',
    service: SERVICE_CONFIG.name,
    version: SERVICE_CONFIG.version,
    timestamp: new Date().toISOString(),
    message: `📊 ${SERVICE_CONFIG.name} v${SERVICE_CONFIG.version}`,
    features: SERVICE_CONFIG.features,
    uptime: process.uptime(),
    node: process.version,
    environment: SERVICE_CONFIG.environment,
    logLevel: SERVICE_CONFIG.logLevel,
    config: {
      port: SERVICE_CONFIG.port,
      redisUrl: process.env.REDIS_URL ? '***configured***' : 'not set'
    }
  }))
  .get('/', () => ({
    service: SERVICE_CONFIG.name,
    version: SERVICE_CONFIG.version,
    endpoints: ['/health', '/config'],
    environment: SERVICE_CONFIG.environment
  }))
  .get('/config', () => ({
    service: SERVICE_CONFIG.name,
    environment: SERVICE_CONFIG.environment,
    logLevel: SERVICE_CONFIG.logLevel,
    port: SERVICE_CONFIG.port,
    features: SERVICE_CONFIG.features,
    // Show non-sensitive config only
    configSources: {
      configMap: 'walder-config',
      secret: 'walder-secrets'
    }
  }))
  .listen({ port: SERVICE_CONFIG.port })

console.log(`📊 ${SERVICE_CONFIG.name} v${SERVICE_CONFIG.version}`)
console.log(`🚀 Server running: http://localhost:${SERVICE_CONFIG.port}`)
console.log(`🌍 Environment: ${SERVICE_CONFIG.environment}`)
console.log(`📊 Log Level: ${SERVICE_CONFIG.logLevel}`)
console.log(`🔧 Features: ${SERVICE_CONFIG.features.join(' • ')}`)
