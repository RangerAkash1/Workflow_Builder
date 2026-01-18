# Helm Chart Deployment Guide

This guide explains how to deploy the Workflow Application using Helm charts.

## Prerequisites

- Helm 3.x installed
- Kubernetes cluster access (kubectl configured)
- Docker images built and available

## Installation

### Step 1: Update Configuration

Edit `helm/workflow-app/values.yaml` and update the following:

1. **API Keys** (Required):
```yaml
backend:
  secrets:
    openaiApiKey: "your-actual-openai-api-key"
    geminiApiKey: "your-actual-gemini-api-key"
    serpapiKey: "your-actual-serpapi-key"
    braveApiKey: "your-actual-brave-api-key"
```

2. **Database Credentials** (Optional):
```yaml
postgres:
  auth:
    username: workflowuser
    password: change-this-password
    database: workflows
```

3. **Image Repositories** (if using a registry):
```yaml
backend:
  image:
    repository: your-registry.com/workflow-backend
    tag: latest

frontend:
  image:
    repository: your-registry.com/workflow-frontend
    tag: latest
```

### Step 2: Create Namespace

```bash
kubectl create namespace workflow-app
```

### Step 3: Install with Helm

#### Basic Installation
```bash
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --create-namespace
```

#### Installation with Custom Values
```bash
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --create-namespace \
  --values custom-values.yaml
```

#### Installation with CLI Overrides
```bash
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --set backend.secrets.openaiApiKey="sk-xxxxx" \
  --set backend.secrets.geminiApiKey="xxxxx" \
  --set postgres.auth.password="securepassword"
```

### Step 4: Verify Installation

```bash
# Check the release status
helm status workflow-app -n workflow-app

# List all releases
helm list -n workflow-app

# Check all resources
kubectl get all -n workflow-app

# Check pods status
kubectl get pods -n workflow-app -w
```

## Configuration Options

### Global Settings

```yaml
namespace: workflow-app  # Kubernetes namespace
global:
  storageClass: standard  # Default storage class
```

### PostgreSQL Configuration

```yaml
postgres:
  enabled: true  # Enable/disable PostgreSQL deployment
  image:
    repository: postgres
    tag: 15-alpine
  auth:
    username: workflowuser
    password: workflowpass
    database: workflows
  persistence:
    enabled: true
    size: 10Gi  # Storage size
    storageClass: ""  # Leave empty to use global
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Backend Configuration

```yaml
backend:
  enabled: true
  replicaCount: 2  # Number of replicas
  image:
    repository: workflow-backend
    tag: latest
  service:
    type: ClusterIP  # ClusterIP, NodePort, or LoadBalancer
    port: 8000
  secrets:
    openaiApiKey: "your-key"
    geminiApiKey: "your-key"
    serpapiKey: "your-key"
    braveApiKey: "your-key"
  persistence:
    enabled: true
    size: 5Gi
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
```

### Frontend Configuration

```yaml
frontend:
  enabled: true
  replicaCount: 2
  image:
    repository: workflow-frontend
    tag: latest
  service:
    type: LoadBalancer  # Change to NodePort for local
    port: 80
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
```

### Ingress Configuration

```yaml
ingress:
  enabled: false  # Set to true to enable ingress
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: workflow.yourdomain.com
      paths:
        - path: /api
          pathType: Prefix
          backend: backend
        - path: /
          pathType: Prefix
          backend: frontend
  tls:
    - secretName: workflow-tls
      hosts:
        - workflow.yourdomain.com
```

## Upgrade

### Upgrade the Release

```bash
# Upgrade with updated values file
helm upgrade workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --values updated-values.yaml

# Upgrade with CLI overrides
helm upgrade workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --set backend.replicaCount=5

# Force upgrade (recreate resources)
helm upgrade workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --force
```

### Rollback

```bash
# View release history
helm history workflow-app -n workflow-app

# Rollback to previous version
helm rollback workflow-app -n workflow-app

# Rollback to specific revision
helm rollback workflow-app 2 -n workflow-app
```

## Uninstall

```bash
# Uninstall the release
helm uninstall workflow-app -n workflow-app

# Also delete the namespace
kubectl delete namespace workflow-app

# Delete with keeping history
helm uninstall workflow-app -n workflow-app --keep-history
```

## Common Deployment Scenarios

### Scenario 1: Local Development (Minikube)

Create `values-local.yaml`:
```yaml
frontend:
  service:
    type: NodePort

backend:
  image:
    pullPolicy: IfNotPresent
  
  autoscaling:
    enabled: false
  
  replicaCount: 1

postgres:
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "250m"
```

Deploy:
```bash
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --create-namespace \
  --values values-local.yaml
```

### Scenario 2: Production Deployment with Ingress

Create `values-prod.yaml`:
```yaml
backend:
  image:
    repository: myregistry.com/workflow-backend
    tag: v1.0.0
    pullPolicy: Always
  
  replicaCount: 3
  
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20

frontend:
  image:
    repository: myregistry.com/workflow-frontend
    tag: v1.0.0
    pullPolicy: Always
  
  service:
    type: ClusterIP  # Use ingress instead

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: workflow.example.com
      paths:
        - path: /api
          pathType: Prefix
          backend: backend
        - path: /
          pathType: Prefix
          backend: frontend
  tls:
    - secretName: workflow-tls
      hosts:
        - workflow.example.com

postgres:
  persistence:
    size: 50Gi
    storageClass: "fast-ssd"
```

Deploy:
```bash
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --create-namespace \
  --values values-prod.yaml \
  --set backend.secrets.openaiApiKey=$OPENAI_API_KEY \
  --set backend.secrets.geminiApiKey=$GEMINI_API_KEY
```

### Scenario 3: High Availability Setup

Create `values-ha.yaml`:
```yaml
backend:
  replicaCount: 5
  
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 30
    targetCPUUtilizationPercentage: 60
  
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"

frontend:
  replicaCount: 3
  
  autoscaling:
    minReplicas: 3
    maxReplicas: 10

postgres:
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
  
  persistence:
    size: 100Gi
    storageClass: "premium-ssd"
```

## Troubleshooting

### Check Helm Release

```bash
# Get release information
helm get all workflow-app -n workflow-app

# Get values used in release
helm get values workflow-app -n workflow-app

# Get manifest
helm get manifest workflow-app -n workflow-app

# Get hooks
helm get hooks workflow-app -n workflow-app
```

### Debug Installation

```bash
# Dry run to see what will be installed
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --dry-run --debug

# Template to see rendered manifests
helm template workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --debug
```

### Common Issues

#### Issue 1: Image Pull Errors
```bash
# Check if images exist locally (Minikube)
eval $(minikube docker-env)
docker images | grep workflow

# Pull images manually
docker pull workflow-backend:latest
docker pull workflow-frontend:latest
```

#### Issue 2: Persistent Volume Not Binding
```bash
# Check PVC status
kubectl get pvc -n workflow-app

# Check PV availability
kubectl get pv

# For Minikube, ensure storage provisioner is running
minikube addons enable storage-provisioner
```

#### Issue 3: Pods Not Starting
```bash
# Check pod status
kubectl get pods -n workflow-app

# Describe problematic pod
kubectl describe pod <pod-name> -n workflow-app

# View logs
kubectl logs <pod-name> -n workflow-app

# Check events
kubectl get events -n workflow-app --sort-by='.lastTimestamp'
```

## Advanced Usage

### Using with External Database

Disable PostgreSQL and provide external database URL:

```yaml
postgres:
  enabled: false

backend:
  secrets:
    databaseUrl: "postgresql://user:pass@external-db:5432/workflows"
```

Then update `templates/secrets.yaml` to use custom DATABASE_URL.

### Custom Resource Limits

```bash
helm upgrade workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --set backend.resources.limits.memory=2Gi \
  --set backend.resources.limits.cpu=2000m
```

### Multi-Environment Deployment

Use different values files for each environment:

```bash
# Development
helm install workflow-dev ./helm/workflow-app \
  --namespace workflow-dev \
  --values values-dev.yaml

# Staging
helm install workflow-staging ./helm/workflow-app \
  --namespace workflow-staging \
  --values values-staging.yaml

# Production
helm install workflow-prod ./helm/workflow-app \
  --namespace workflow-prod \
  --values values-prod.yaml
```

## Monitoring

### Check Resource Usage

```bash
# Pod resource usage
kubectl top pods -n workflow-app

# Node resource usage
kubectl top nodes

# HPA status
kubectl get hpa -n workflow-app
```

### Access Logs

```bash
# Stream logs from all backend pods
kubectl logs -f -l app.kubernetes.io/component=backend -n workflow-app

# Stream logs from all frontend pods
kubectl logs -f -l app.kubernetes.io/component=frontend -n workflow-app
```

## Best Practices

1. **Always use version control** for your values files
2. **Never commit secrets** - use external secret managers
3. **Test upgrades** in staging before production
4. **Monitor resource usage** and adjust limits accordingly
5. **Use specific image tags** instead of `latest` in production
6. **Enable autoscaling** for better resource utilization
7. **Implement proper backup** strategy for PostgreSQL
8. **Use ingress with TLS** for production deployments
9. **Set resource requests and limits** appropriately
10. **Enable monitoring and logging** solutions

## Support

For issues or questions:
- Check logs: `kubectl logs <pod-name> -n workflow-app`
- Review events: `kubectl get events -n workflow-app`
- Consult Helm documentation: https://helm.sh/docs/
