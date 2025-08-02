# Walder Crypto Data Loader

Cryptocurrency data synchronization service with ClickHouse storage.

## Development

```bash
tilt up
```
- Local minikube development
- Hot reload enabled
- External ClickHouse (db.walder.ai)
- UI: http://localhost:10350

## Production

```bash
./deploy/prod.sh
```
- Builds & deploys to DigitalOcean K8s
- Internal VDS ClickHouse
- Auto-cleans registry

## Monitoring Production

```bash
PROD=1 tilt up
```
- Live prod logs & status
- Port forwarding to prod services

## Infrastructure Setup

```bash
./deploy/prod.sh --setup
```
- Creates DO registry & K8s cluster
- Cost: $12/month

## Architecture

- **App**: Bun + Elysia + CCXT
- **Database**: ClickHouse (prod/dev schemas)
- **Deploy**: Single script, Kubernetes secrets
- **Registry**: Auto-cleanup, latest tag only