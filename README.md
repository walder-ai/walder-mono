# Walder Monorepo

Microservices platform for cryptocurrency data aggregation.

## Quick Start

### Local Development
```bash
cp deploy/k8s/redis-secret.yaml.example deploy/k8s/redis-secret.yaml
docker run -d -p 6379:6379 redis/redis-stack-server
tilt up
```

### Production
```bash
git push origin main  # Auto-builds only changed services
```

## Services

### analytics-service
Data analysis and reporting service.

**Tech Stack:** Bun + Elysia  
**Port:** 3000

### market-fetcher
Cryptocurrency exchange data aggregation service.

**Tech Stack:** Bun + Elysia + CCXT + Redis Time Series  
**Port:** 3001

```bash
bun run dev:market-fetcher
bun run build:market-fetcher  
bun run start:market-fetcher
```

### Adding New Services
```bash
./scripts/add-service.sh analytics-service
./scripts/add-service.sh api-gateway  
./scripts/add-service.sh user-service
```

### Removing Services
```bash
./scripts/remove-service.sh analytics-service
# Confirms deletion and removes all related files
```

### Quick Aliases (optional)
```bash
source scripts/aliases.sh
add-service user-service      # Same as ./scripts/add-service.sh
remove-service user-service   # Same as ./scripts/remove-service.sh  
list-services                 # Same as npx nx show projects --type=app
```

Each new service automatically gets:
- ✅ Nx project configuration
- ✅ Docker build setup  
- ✅ Kubernetes manifests
- ✅ CI/CD pipeline integration
- ✅ Selective building (only when changed)
- ✅ Unified health endpoint with dependency checking
- ✅ Auto port assignment (3000, 3001, 3002...)

## Universal Commands

```bash
bun run dev     # Start all services
bun run build   # Build all services
bun run start   # Start all built services
bun run clean   # Clear Nx cache
```

## Development & Deployment

### Local Development 
```bash
tilt up
# Local Kubernetes with hot reload
```

### Production FluxCD (GitOps)
```bash
git push  # GitHub Actions builds → FluxCD deploys
```

### Monitor
```bash
flux get all      # FluxCD status
kubectl get pods  # Application status
```

## GitOps with FluxCD

✅ **Simple Structure** - All manifests in one file: `clusters/production/all.yaml`  
✅ **Automatic Deployments** - Push to main triggers deployment  
✅ **Git as Source of Truth** - Change replicas/config/images via Git  
✅ **No kubectl needed** - Just `git commit && git push`

### Structure (6 files total)
```
clusters/production/
├── flux-system/           # FluxCD controllers (3 files)
├── infrastructure.yaml    # Namespace
├── redis-secret.yaml      # Encrypted with SOPS  
├── analytics-service.yaml # Analytics deployment + service
├── market-fetcher.yaml    # Market-fetcher config + deployment + service
└── kustomization.yaml     # Links all files (1 file)
```

### Security with SOPS
✅ **Encrypted Secrets** - Secrets encrypted with age  
✅ **Auto Decryption** - FluxCD decrypts automatically  
✅ **Git Safe** - Encrypted secrets can be committed  
✅ **Zero Manual Steps** - No kubectl apply needed

## Architecture

```
walder-mono/
├── services/           # Microservices
├── deploy/k8s/        # Kubernetes manifests  
├── Tiltfile           # Local development
└── README.md          # Documentation
```

## Tech Stack

- **Monorepo:** Nx
- **Runtime:** Bun
- **API:** Elysia
- **Database:** Redis Time Series
- **Exchange:** CCXT
- **Container:** Docker + Kubernetes
- **Development:** Tilt

## Production Deployment

Registry: `ghcr.io/walder-ai/walder-monorepo/market-fetcher:latest`

The application automatically deploys via GitHub Actions on push to main branch. 