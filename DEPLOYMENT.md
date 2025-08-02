# 🚀 GitOps Deployment Guide

## Architecture

```
GitHub → GitHub Actions → DO Registry → ArgoCD → Kubernetes
```

## Workflow

### 1. Development
```bash
# Local development with live reload
cd data-loader
tilt up
```

### 2. CI/CD Pipeline (Automatic)

**Trigger:** Push to `main` branch with changes in `data-loader/` folder

**GitHub Actions will:**
1. Build Docker image with tag `main-{short-sha}`
2. Push to `registry.digitalocean.com/walder/data-loader`
3. Update `deploy/services/data-loader/deployment.yaml` with new image tag
4. Commit changes back to repo

**ArgoCD will:**
1. Detect git changes automatically (30s polling)
2. Deploy new image to Kubernetes
3. Update deployment status in UI

### 3. Manual Operations

**View deployment status:**
```bash
open https://argo.walder.ai
# Username: admin
# Password: [get from kubectl command below]
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**Force sync (if needed):**
```bash
# Via ArgoCD UI: Applications → data-loader → Sync
# Or via CLI:
argocd app sync data-loader
```

**Rollback:**
```bash
# Via ArgoCD UI: Applications → data-loader → History & Rollback
# Or revert git commit and push
```

## Setup Requirements

### GitHub Secrets
Add to repository settings → Secrets and variables → Actions:

- `DO_REGISTRY_TOKEN`: DigitalOcean registry access token

### Repository Access
GitHub Actions needs write access to update deployment manifests:
- Settings → Actions → General → Workflow permissions → Read and write permissions

## File Structure

```
walder-mono/
├── .github/workflows/
│   └── build-and-deploy.yml    # CI/CD pipeline
├── data-loader/                # Source code
├── deploy/
│   ├── argocd/
│   │   └── data-loader-app.yaml # ArgoCD Application
│   ├── services/data-loader/    # K8s manifests
│   └── shared/                  # Shared resources
└── DEPLOYMENT.md               # This file
```

## Monitoring

- **ArgoCD UI:** https://argo.walder.ai
- **GitHub Actions:** Repository → Actions tab
- **Kubernetes:** `kubectl get pods -n walder`

## Troubleshooting

**ArgoCD out of sync:**
- Check git repo for latest commits
- Verify image exists in registry
- Check ArgoCD logs: `kubectl logs -n argocd deployment/argocd-application-controller`

**Build failures:**
- Check GitHub Actions logs
- Verify DO registry token is valid
- Ensure dockerfile path is correct