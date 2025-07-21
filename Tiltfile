# Load extensions for optimized development
load('ext://restart_process', 'docker_build_with_restart')

# Auto-discover services
services_output = str(local('npx nx show projects --type=app')).strip()
services = services_output.split('\n') if services_output else []

print('🔍 Services: %s' % services)

# Deploy shared infrastructure
print('📋 Deploying shared infrastructure...')
k8s_yaml('k8s/namespace.yaml')
k8s_yaml('k8s/redis.yaml')
k8s_resource('redis', labels=['infrastructure'])

# Deploy each service with its own k8s configs
for service in services:
  if service.strip():
    service_dir = 'services/%s' % service
    service_k8s_dir = '%s/k8s' % service_dir
    
    print('📦 Deploying %s...' % service)
    
    # Deploy service-specific configs
    k8s_yaml('%s/config.yaml' % service_k8s_dir)
    k8s_yaml('%s/deployment.yaml' % service_k8s_dir)
    
    # Optimized Docker build with process restart
    docker_build_with_restart(
      service,
      '.',
      dockerfile='%s/Dockerfile' % service_dir,
      target='dev',
      # Only rebuild when these directories change
      only=[
        service_dir,
        'package.json',
        'bun.lock',
        'shared/'
      ],
      # Fast file sync for development
      live_update=[
        # Sync source code changes instantly
        sync('%s/src' % service_dir, '/app/%s/src' % service_dir),
        sync('shared/', '/app/shared/'),
        
        # Restart on dependency changes
        run('bun install', trigger=['package.json', 'bun.lock'])
      ],
      # Process to restart on changes
      entrypoint=['bun', '--watch', '%s/src/index.ts' % service_dir]
    )
    
    # Port forward with clear ports
    k8s_resource(
      service,
      port_forwards='%d:3000' % (3000 + services.index(service)),
      labels=['microservices'],
      resource_deps=['redis']
    )

# Port forward Redis for external access
k8s_resource('redis', 
  port_forwards=[
    '6379:6379',     # Redis direct access
    '8001:8001'      # Redis Insight web UI
  ]
)

# Performance settings
update_settings(max_parallel_updates=5)
update_settings(k8s_upsert_timeout_secs=30)

print('🚀 Development optimized!')
print('📊 Tilt UI: http://localhost:10350')
print('🔧 Analytics: http://localhost:3000')
print('📈 Market-fetcher: http://localhost:3001')
print('🗄️  Redis: localhost:6379')
print('🔍 Redis Insight: http://localhost:8001')
print('📁 Clean k8s structure: k8s/ + services/*/k8s/')