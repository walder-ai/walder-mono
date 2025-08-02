#!/bin/bash
set -e

SETUP_INFRA=${1:-false}

# Setup infrastructure if requested
if [ "$SETUP_INFRA" = "--setup" ]; then
    echo "🏗️ Setting up DO infrastructure..."
    
    # Create registry if not exists
    if ! doctl registry get walder >/dev/null 2>&1; then
        echo "📦 Creating registry..."
        doctl registry create walder --region fra1
    else
        echo "📦 Registry already exists"
    fi
    
    # Create K8s cluster if not exists
    if ! doctl kubernetes cluster get walder-k8s >/dev/null 2>&1; then
        echo "☸️ Creating Kubernetes cluster..."
        doctl kubernetes cluster create walder-k8s \
          --region fra1 \
          --node-pool "name=worker;size=s-1vcpu-2gb;count=1" \
          --wait
    else
        echo "☸️ Kubernetes cluster already exists"
    fi
    
    doctl kubernetes cluster kubeconfig save walder-k8s
    doctl registry login
    
    echo "✅ Infrastructure ready! Cost: $12/month"
    echo "📋 Next: Integrate registry with K8s in Control Panel:"
    echo "   https://cloud.digitalocean.com/registry → Settings → K8s integration"
    echo "Then configure: cp prod.env.example prod.env"
    exit 0
fi

# Deploy application
echo "☸️ Switching to production context..."
kubectl config use-context do-fra1-walder-k8s

REGISTRY="registry.digitalocean.com/walder"
IMAGE_LATEST="$REGISTRY/data-loader:latest"
IMAGE_PREVIOUS="$REGISTRY/data-loader:previous"

echo "🔨 Building & pushing latest..."
docker build -f deploy/services/data-loader/dockerfile --platform linux/amd64 --target prod -t $IMAGE_LATEST .
docker push $IMAGE_LATEST

echo "🚀 Deploying..."
# Apply shared secrets, configmap and unified deployment (already prod-ready)
kubectl apply -f deploy/shared/clickhouse-secrets.yaml
kubectl apply -f deploy/services/data-loader/configmap.yaml
sed 's|image: data-loader|image: '$IMAGE_LATEST'|' deploy/services/data-loader/deployment.yaml | kubectl apply -f -
kubectl rollout status deployment/data-loader -n walder --timeout=600s

echo "🧹 Cleaning old pods..."
# Delete old ReplicaSets (keep latest 2)
kubectl get replicasets -n walder --sort-by='.metadata.creationTimestamp' -o name | head -n -2 | xargs -r kubectl delete -n walder

echo "🧹 Cleaning registry..."
doctl registry repository list-tags data-loader --format Tag --no-header | grep -v -E '^(latest|)$' | head -5 | while read tag; do
    [ ! -z "$tag" ] && doctl registry repository delete-tag data-loader $tag --force
done
doctl registry garbage-collection start --include-untagged-manifests --force >/dev/null 2>&1 || true

echo "✅ Deployed: $IMAGE_LATEST"