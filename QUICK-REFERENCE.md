# Docker & Kubernetes Quick Reference

## Docker Commands

### Build Images
```bash
# Windows
build-images.bat [tag]

# Linux/macOS
./build-images.sh [tag]

# Manual build
docker build -t workflow-backend:latest ./backend
docker build -t workflow-frontend:latest ./frontend
```

### Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Push to Registry
```bash
# Tag images
docker tag workflow-backend:latest your-registry/workflow-backend:latest
docker tag workflow-frontend:latest your-registry/workflow-frontend:latest

# Push images
docker push your-registry/workflow-backend:latest
docker push your-registry/workflow-frontend:latest
```

## Kubernetes Commands

### Deployment

#### Quick Deploy
```bash
# Deploy everything
kubectl apply -f k8s/

# Or use the script
./k8s/deploy.sh
```

#### Step-by-Step Deploy
```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (update first!)
kubectl apply -f k8s/secrets.yaml

# 3. Create config
kubectl apply -f k8s/configmap.yaml

# 4. Create volumes
kubectl apply -f k8s/persistent-volumes.yaml

# 5. Deploy database
kubectl apply -f k8s/postgres-deployment.yaml

# 6. Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# 7. Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# 8. Deploy autoscaling
kubectl apply -f k8s/hpa.yaml

# 9. Deploy ingress (optional)
kubectl apply -f k8s/ingress.yaml
```

### Viewing Resources

```bash
# View all resources
kubectl get all -n workflow-app

# View pods
kubectl get pods -n workflow-app

# View services
kubectl get svc -n workflow-app

# View deployments
kubectl get deployments -n workflow-app

# View persistent volumes
kubectl get pv,pvc -n workflow-app

# View ingress
kubectl get ingress -n workflow-app
```

### Checking Status

```bash
# Check pod status with watch
kubectl get pods -n workflow-app -w

# Describe a pod
kubectl describe pod <pod-name> -n workflow-app

# View pod logs
kubectl logs <pod-name> -n workflow-app

# Follow logs
kubectl logs -f <pod-name> -n workflow-app

# View logs from all backend pods
kubectl logs -l app=backend -n workflow-app

# View events
kubectl get events -n workflow-app --sort-by='.lastTimestamp'
```

### Accessing Application

```bash
# Port forward frontend
kubectl port-forward svc/frontend-service 8080:80 -n workflow-app

# Port forward backend
kubectl port-forward svc/backend-service 8000:8000 -n workflow-app

# Get LoadBalancer IP (if using LoadBalancer)
kubectl get svc frontend-service -n workflow-app

# For Minikube
minikube service frontend-service -n workflow-app --url
```

### Scaling

```bash
# Manual scale
kubectl scale deployment backend --replicas=5 -n workflow-app
kubectl scale deployment frontend --replicas=3 -n workflow-app

# Check HPA status
kubectl get hpa -n workflow-app

# Describe HPA
kubectl describe hpa backend-hpa -n workflow-app
```

### Updates & Rollbacks

```bash
# Update image
kubectl set image deployment/backend backend=workflow-backend:v2 -n workflow-app

# Restart deployment
kubectl rollout restart deployment/backend -n workflow-app

# Check rollout status
kubectl rollout status deployment/backend -n workflow-app

# View rollout history
kubectl rollout history deployment/backend -n workflow-app

# Rollback to previous version
kubectl rollout undo deployment/backend -n workflow-app

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n workflow-app
```

### Debugging

```bash
# Get shell in pod
kubectl exec -it <pod-name> -n workflow-app -- /bin/bash

# Run command in pod
kubectl exec <pod-name> -n workflow-app -- env

# Copy files from pod
kubectl cp workflow-app/<pod-name>:/path/to/file ./local-file

# Copy files to pod
kubectl cp ./local-file workflow-app/<pod-name>:/path/to/file

# Check resource usage
kubectl top pods -n workflow-app
kubectl top nodes
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it <postgres-pod> -n workflow-app -- psql -U workflowuser -d workflows

# Backup database
kubectl exec <postgres-pod> -n workflow-app -- pg_dump -U workflowuser workflows > backup.sql

# Restore database
kubectl exec -i <postgres-pod> -n workflow-app -- psql -U workflowuser workflows < backup.sql

# Run SQL command
kubectl exec <postgres-pod> -n workflow-app -- psql -U workflowuser -d workflows -c "SELECT * FROM workflows LIMIT 10;"
```

### Cleanup

```bash
# Delete specific resource
kubectl delete -f k8s/frontend-deployment.yaml

# Delete all resources in namespace
kubectl delete all --all -n workflow-app

# Delete namespace (removes everything)
kubectl delete namespace workflow-app

# Use cleanup script
./k8s/cleanup.sh
```

## Helm Commands

### Installation

```bash
# Basic install
helm install workflow-app ./helm/workflow-app -n workflow-app --create-namespace

# Install with custom values
helm install workflow-app ./helm/workflow-app -n workflow-app --values custom-values.yaml

# Install with overrides
helm install workflow-app ./helm/workflow-app -n workflow-app \
  --set backend.replicaCount=5 \
  --set backend.secrets.openaiApiKey="sk-xxxxx"

# Dry run
helm install workflow-app ./helm/workflow-app -n workflow-app --dry-run --debug
```

### Management

```bash
# List releases
helm list -n workflow-app

# Get release status
helm status workflow-app -n workflow-app

# Get values
helm get values workflow-app -n workflow-app

# Get manifest
helm get manifest workflow-app -n workflow-app
```

### Upgrade & Rollback

```bash
# Upgrade
helm upgrade workflow-app ./helm/workflow-app -n workflow-app

# Upgrade with new values
helm upgrade workflow-app ./helm/workflow-app -n workflow-app --values new-values.yaml

# View history
helm history workflow-app -n workflow-app

# Rollback
helm rollback workflow-app -n workflow-app

# Rollback to specific revision
helm rollback workflow-app 2 -n workflow-app
```

### Uninstall

```bash
# Uninstall release
helm uninstall workflow-app -n workflow-app

# Uninstall with history
helm uninstall workflow-app -n workflow-app --keep-history
```

## Minikube Commands

### Setup

```bash
# Start Minikube
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner

# Configure Docker to use Minikube's daemon
eval $(minikube docker-env)  # Linux/macOS
& minikube -p minikube docker-env --shell powershell | Invoke-Expression  # Windows
```

### Management

```bash
# Get Minikube IP
minikube ip

# Access service
minikube service frontend-service -n workflow-app

# Open dashboard
minikube dashboard

# SSH into Minikube
minikube ssh

# Stop Minikube
minikube stop

# Delete Minikube
minikube delete
```

## Troubleshooting Quick Tips

### Pods Not Starting
```bash
kubectl describe pod <pod-name> -n workflow-app
kubectl logs <pod-name> -n workflow-app
```

### Image Pull Errors
```bash
# Check image exists
docker images | grep workflow

# For Minikube, use Minikube's Docker
eval $(minikube docker-env)
./build-images.sh
```

### Database Connection Issues
```bash
# Check if PostgreSQL is ready
kubectl get pods -l app=postgres -n workflow-app
kubectl logs <postgres-pod> -n workflow-app

# Test connection
kubectl exec <backend-pod> -n workflow-app -- env | grep DATABASE
```

### Service Not Accessible
```bash
# Check service endpoints
kubectl get endpoints -n workflow-app

# Port forward to test
kubectl port-forward svc/backend-service 8000:8000 -n workflow-app
```

### PVC Not Binding
```bash
# Check PVC and PV status
kubectl get pv,pvc -n workflow-app

# Describe PVC
kubectl describe pvc <pvc-name> -n workflow-app

# For Minikube
minikube addons enable storage-provisioner
```

## Common Workflows

### Full Local Setup (Minikube)
```bash
# 1. Start Minikube
minikube start --cpus=4 --memory=8192

# 2. Enable addons
minikube addons enable ingress metrics-server

# 3. Configure Docker
eval $(minikube docker-env)

# 4. Build images
./build-images.sh

# 5. Update secrets in k8s/secrets.yaml

# 6. Deploy
./k8s/deploy.sh

# 7. Access app
minikube service frontend-service -n workflow-app
```

### Update and Redeploy
```bash
# 1. Make code changes

# 2. Rebuild images
docker build -t workflow-backend:latest ./backend

# 3. Restart deployment
kubectl rollout restart deployment/backend -n workflow-app

# 4. Check status
kubectl rollout status deployment/backend -n workflow-app
```

### Clean Slate
```bash
# 1. Delete everything
kubectl delete namespace workflow-app

# 2. Delete Minikube (optional)
minikube delete

# 3. Start fresh
minikube start --cpus=4 --memory=8192
eval $(minikube docker-env)
./build-images.sh
./k8s/deploy.sh
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias kd='kubectl describe'
alias ke='kubectl exec -it'
alias kpf='kubectl port-forward'
alias kdel='kubectl delete'

# Namespace specific
alias kn='kubectl -n workflow-app'
alias kgnp='kubectl get pods -n workflow-app'
alias klnf='kubectl logs -f -n workflow-app'
```

## Environment Variables

Set these before deployment:

```bash
# Export API keys
export OPENAI_API_KEY="sk-xxxxx"
export GEMINI_API_KEY="xxxxx"
export SERPAPI_KEY="xxxxx"
export BRAVE_API_KEY="xxxxx"

# Use in Helm
helm install workflow-app ./helm/workflow-app -n workflow-app \
  --set backend.secrets.openaiApiKey=$OPENAI_API_KEY \
  --set backend.secrets.geminiApiKey=$GEMINI_API_KEY
```
