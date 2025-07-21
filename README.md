# Walder Monorepo

Microservices platform for cryptocurrency data aggregation.

## Quick Start

### Local Development
```bash
# Убедись что Minikube запущен
minikube start

# Подключись к Minikube
kubectl config use-context minikube

# Запусти всё с оптимизациями
tilt up
```

## Development Features ⚡

- 🚀 **Instant Hot Reload** - изменения в коде применяются мгновенно
- 📦 **Smart Rebuilds** - пересборка только при изменении зависимостей  
- 🔄 **K8s Redis** - Redis как отдельный Pod в кластере
- 🎯 **Optimized Sync** - только измененные файлы синхронизируются
- 📊 **Live Dashboard** - Tilt UI на http://localhost:10350
- 🏗️ **Parallel Builds** - до 5 сервисов собираются параллельно
- 🔗 **Resource Dependencies** - правильный порядок запуска
- ⚙️ **Clean K8s Structure** - простая и понятная организация манифестов

## Structure

```
k8s/                          # Shared infrastructure
├── namespace.yaml            # Common namespace
└── redis.yaml               # Redis infrastructure

services/
├── analytics-service/
│   ├── k8s/
│   │   ├── config.yaml      # Service-specific ConfigMap + Secret
│   │   └── deployment.yaml  # Deployment + Service
│   └── src/
└── market-fetcher/
    ├── k8s/
    │   ├── config.yaml      # Service-specific ConfigMap + Secret
    │   └── deployment.yaml  # Deployment + Service
    └── src/
```

## Configuration Management 🔧

**Service-specific ConfigMaps:**
```yaml
# analytics-service
ANALYTICS_ENABLED: "true"
ANALYTICS_BATCH_SIZE: "100"

# market-fetcher  
MARKET_SPOT_ENABLED: "true"
SCHEDULER_INTERVAL: "300000"
```

**Service-specific Secrets:**
```yaml
REDIS_URL: "redis://redis-service:6379"
BINANCE_API_KEY: "dev-api-key"
```

### Изменение конфигурации:
```bash
# Изменить ConfigMap
kubectl edit configmap market-fetcher-config -n walder-apps

# Изменить Secrets  
kubectl edit secret market-fetcher-secrets -n walder-apps

# Перезапустить сервис
kubectl rollout restart deployment/market-fetcher -n walder-apps
```

## Services

### analytics-service
Data analysis and reporting service.

**Tech Stack:** Bun + Elysia  
**Port:** 3000  
**Config:** `services/analytics-service/k8s/`

### market-fetcher
Cryptocurrency exchange data aggregation service.

**Tech Stack:** Bun + Elysia + CCXT + Redis Time Series  
**Port:** 3001  
**Config:** `services/market-fetcher/k8s/`

### Adding New Services
Each new service automatically gets:
- ✅ Nx project configuration
- ✅ Docker build setup  
- ✅ Own k8s directory with configs
- ✅ Service-specific ConfigMap + Secret
- ✅ Resource limits and health checks
- ✅ Auto port assignment (3000, 3001, 3002...)
- ✅ Hot reload optimization

## Development Commands

```bash
bun run dev     # Start all services locally
bun run build   # Build all services
bun run start   # Start all built services
bun run clean   # Clear Nx cache
```

## Tilt Development Workflow

```bash
tilt up           # Start optimized development
tilt down         # Stop all services
```

**Access Points:**
- 📊 Tilt UI: http://localhost:10350
- 🔧 Analytics: http://localhost:3000  
- 📈 Market-fetcher: http://localhost:3001
- 🗄️ Redis: localhost:6379
- 🔍 Redis Insight: http://localhost:8001

## Environment Variables 📋

### Analytics Service
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVICE_NAME` | ConfigMap | `analytics-service` | Service identifier |
| `LOG_LEVEL` | ConfigMap | `info` | Logging level |
| `ANALYTICS_ENABLED` | ConfigMap | `true` | Enable analytics |
| `ANALYTICS_BATCH_SIZE` | ConfigMap | `100` | Batch processing size |

### Market Fetcher
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVICE_NAME` | ConfigMap | `market-fetcher` | Service identifier |
| `MARKET_SPOT_ENABLED` | ConfigMap | `true` | Enable spot trading |
| `MARKET_FUTURES_ENABLED` | ConfigMap | `true` | Enable futures |
| `SCHEDULER_INTERVAL` | ConfigMap | `300000` | Fetch interval (5min) |
| `REDIS_URL` | Secret | `redis://redis-service:6379` | Redis connection |

## Performance Tips

- ✅ Простая структура: `k8s/` для общих ресурсов, `services/*/k8s/` для сервисов
- ✅ Используй только `tilt up` для разработки
- ✅ Файлы синхронизируются мгновенно при сохранении
- ✅ Изменения конфигурации через `kubectl edit`
- ✅ Логи в реальном времени в Tilt UI
- ✅ Автоматическая очистка при `tilt down` 