# Auto-discover services
services_output = str(local('npx nx show projects --type=app')).strip()
services = services_output.split('\n') if services_output else []

USE_FLUX = os.environ.get('USE_FLUX', 'false') == 'true'
print('🔍 Services: %s' % services)

# Deploy manifests
if USE_FLUX:
  k8s_yaml('clusters/production/')
else:
  # Local dev - infrastructure with local Redis URL
  k8s_yaml(blob('''
apiVersion: v1
kind: Namespace
metadata:
  name: walder-apps
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: walder-apps
type: Opaque
stringData:
  REDIS_URL: "redis://host.docker.internal:6379"
'''))
  
  for service in services:
    if service.strip():
      manifest_content = str(read_file('clusters/production/%s.yaml' % service))
                   # Replace registry images with local names
             modified_manifest = manifest_content.replace(
               'ghcr.io/walder-ai/%s:latest' % service,
               service
             )
      k8s_yaml(blob(modified_manifest))

for service in services:
  if service.strip():
               # Build image
           docker_build(
             'ghcr.io/walder-ai/%s' % service if USE_FLUX else service,
      '.',
      dockerfile='services/%s/Dockerfile' % service,
      target='dev',
      live_update=[
        sync('./services/%s/src' % service, '/app/services/%s/src' % service),
        run('bun install', trigger=['./package.json', './bun.lock'])
      ]
    )
    
    # Port forward
    k8s_resource(
      service,
      port_forwards='%d:3000' % (3000 + services.index(service)),
      labels=['microservices']
    )

print('✅ Ready: tilt up | FluxCD: USE_FLUX=true tilt up')