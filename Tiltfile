version_settings(constraint='>=0.22.2')

# Local development only - production handled by ArgoCD GitOps
allow_k8s_contexts(['minikube'])

print("🚀 Local development mode - Production managed by ArgoCD")

# Dev context with local overrides
local('kubectl config use-context minikube')

# Apply dev configuration
k8s_yaml(['deploy/shared/clickhouse-secrets.yaml', 'deploy/services/data-loader/configmap.yaml'])
k8s_yaml(local('sed "s/clickhouse-prod/clickhouse-dev/; s/production/development/; s/services/default/" deploy/services/data-loader/deployment.yaml'))

# Build with live reload for development
docker_build('data-loader', '.', 
  dockerfile='deploy/services/data-loader/dockerfile', 
  target='dev',
  live_update=[
    sync('data-loader/src', '/app/src'),
    run('bun install', trigger=['data-loader/package.json'])
  ])

k8s_resource('data-loader', port_forwards='3000:3000')

# Helper for cleaning old resources
local_resource('cleanup-dev',
  cmd='kubectl get replicasets --sort-by=".metadata.creationTimestamp" -o name | head -n -2 | xargs -r kubectl delete',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False
)