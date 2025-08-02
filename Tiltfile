version_settings(constraint='>=0.22.2')

# Allow both contexts since we switch between them
allow_k8s_contexts(['minikube', 'do-fra1-walder-k8s'])

# Check if PROD environment variable is set
is_prod = os.getenv('PROD', '') != ''

if is_prod:
    print("→ Production monitoring mode")
    # Switch to prod context
    local('kubectl config use-context do-fra1-walder-k8s')
    
    # Apply unified deployment (defaults to prod)
    k8s_yaml(['deploy/shared/clickhouse-secrets.yaml', 'deploy/services/data-loader/configmap.yaml', 'deploy/services/data-loader/deployment.yaml'])
    
    # Monitor existing prod deployment with logs
    k8s_resource(
        'data-loader',
        port_forwards='3000:3000',
        resource_deps=[],
        trigger_mode=TRIGGER_MODE_MANUAL  # Don't auto-update
    )
else:
    print("→ Development mode")
    # Switch to dev context
    local('kubectl config use-context minikube')
    
    # Override for dev: use dev secrets and development env
    k8s_yaml(['deploy/shared/clickhouse-secrets.yaml', 'deploy/services/data-loader/configmap.yaml'])
    k8s_yaml(local('sed "s/clickhouse-prod/clickhouse-dev/; s/production/development/" deploy/services/data-loader/deployment.yaml'))
    
    docker_build('data-loader', '.', 
      dockerfile='deploy/services/data-loader/dockerfile', 
      target='dev',
      live_update=[
        sync('data-loader/src', '/app/src'),
        run('bun install', trigger=['data-loader/package.json'])
      ])
    k8s_resource('data-loader', port_forwards='3000:3000')
    
    # Cleanup old ReplicaSets periodically
    local_resource('cleanup-old-pods',
      cmd='kubectl get replicasets -n walder --sort-by=".metadata.creationTimestamp" -o name | head -n -2 | xargs -r kubectl delete -n walder',
      trigger_mode=TRIGGER_MODE_MANUAL,
      auto_init=False
    )