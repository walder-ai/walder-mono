import { Elysia, t } from 'elysia'

const SERVICE_CONFIG = {
  name: process.env.SERVICE_NAME || 'analytics-service',
  version: '1.0.0',
  port: parseInt(process.env.PORT || '3001'),
  environment: process.env.NODE_ENV || 'development'
}

const app = new Elysia({
  // Elysia best practice optimizations
  aot: SERVICE_CONFIG.environment === 'production',
  precompile: SERVICE_CONFIG.environment === 'production',
  nativeStaticResponse: true,
  normalize: true,
  name: SERVICE_CONFIG.name,
  tags: ['analytics']
})
  .get('/health', () => ({
    status: 'healthy' as const,
    service: SERVICE_CONFIG.name,
    version: SERVICE_CONFIG.version,
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
  .listen({ port: SERVICE_CONFIG.port })

console.log(`📊 ${SERVICE_CONFIG.name} v${SERVICE_CONFIG.version}`)
console.log(`🚀 Server: http://localhost:${SERVICE_CONFIG.port}`)
console.log(`🌍 Environment: ${SERVICE_CONFIG.environment}`)
