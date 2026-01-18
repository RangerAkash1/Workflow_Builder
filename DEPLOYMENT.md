# Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Workflow Application to Kubernetes.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start - Local Deployment (Minikube)](#quick-start---local-deployment-minikube)
- [Cloud Deployment (AWS EKS / GCP GKE / Azure AKS)](#cloud-deployment)
- [Deployment Architecture](#deployment-architecture)
- [Configuration](#configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **Docker**: For building container images
- **kubectl**: Kubernetes command-line tool
- **Kubernetes Cluster**: One of the following:
  - Minikube (for local development)
  - AWS EKS / Google GKE / Azure AKS (for production)

### Optional Tools
- **Helm**: For package management (if using Helm charts)
- **k9s**: Terminal UI for Kubernetes
- **Lens**: Desktop application for Kubernetes

---

## Quick Start - Local Deployment (Minikube)

### Step 1: Install Minikube

**Windows:**
```bash
choco install minikube
```

**Linux:**
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**macOS:**
```bash
brew install minikube
```

### Step 2: Start Minikube

```bash
# Start with adequate resources
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Enable ingress addon (optional)
minikube addons enable ingress

# Enable metrics server for HPA
minikube addons enable metrics-server
```

### Step 3: Build Docker Images

The application needs to build images that Minikube can access.

**Point Docker to Minikube's Docker daemon:**
```bash
# Windows (PowerShell)
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# Linux/macOS
eval $(minikube docker-env)
```

**Build the images:**
```bash
# Linux/macOS
./build-images.sh latest

# Windows
build-images.bat latest
```

**Verify images:**
```bash
docker images | grep workflow
```

### Step 4: Configure Secrets

**IMPORTANT:** Update the API keys in `k8s/secrets.yaml`:

```yaml
stringData:
  OPENAI_API_KEY: "your-actual-openai-api-key"
  GEMINI_API_KEY: "your-actual-gemini-api-key"
  SERPAPI_KEY: "your-actual-serpapi-key"
  BRAVE_API_KEY: "your-actual-brave-api-key"
```

### Step 5: Deploy to Kubernetes

#### Option A: Automated Deployment (Recommended)
```bash
# Make script executable
chmod +x k8s/deploy.sh

# Run deployment script
./k8s/deploy.sh
```

#### Option B: Manual Deployment
```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply secrets and config
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# 3. Create persistent volumes
kubectl apply -f k8s/persistent-volumes.yaml

# 4. Deploy database
kubectl apply -f k8s/postgres-deployment.yaml

# Wait for postgres to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n workflow-app --timeout=300s

# 5. Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Wait for backend to be ready
kubectl wait --for=condition=ready pod -l app=backend -n workflow-app --timeout=300s

# 6. Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# 7. Apply autoscaling (optional)
kubectl apply -f k8s/hpa.yaml

# 8. Apply ingress (optional)
kubectl apply -f k8s/ingress.yaml
```

### Step 6: Access the Application

**Option 1: Port Forwarding (Simplest)**
```bash
# Forward frontend service
kubectl port-forward svc/frontend-service 8080:80 -n workflow-app

# Access at: http://localhost:8080
```

**Option 2: LoadBalancer Service**
```bash
# Get the external IP
minikube service frontend-service -n workflow-app --url

# Or open in browser automatically
minikube service frontend-service -n workflow-app
```

**Option 3: Ingress (if enabled)**
```bash
# Get Minikube IP
minikube ip

# Add to /etc/hosts (Linux/macOS) or C:\Windows\System32\drivers\etc\hosts (Windows)
<MINIKUBE-IP> workflow.local

# Access at: http://workflow.local
```

---

## Cloud Deployment

### AWS EKS Deployment

#### Prerequisites
- AWS CLI installed and configured
- eksctl installed
- kubectl installed

#### Step 1: Create EKS Cluster
```bash
# Create cluster with eksctl
eksctl create cluster \
  --name workflow-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 4 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name workflow-cluster
```

#### Step 2: Install NGINX Ingress Controller
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml
```

#### Step 3: Build and Push Images to ECR
```bash
# Create ECR repositories
aws ecr create-repository --repository-name workflow-backend --region us-west-2
aws ecr create-repository --repository-name workflow-frontend --region us-west-2

# Get ECR login
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com

# Build and tag images
docker build -t workflow-backend:latest ./backend
docker build -t workflow-frontend:latest ./frontend

docker tag workflow-backend:latest <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com/workflow-backend:latest
docker tag workflow-frontend:latest <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com/workflow-frontend:latest

# Push to ECR
docker push <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com/workflow-backend:latest
docker push <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com/workflow-frontend:latest
```

#### Step 4: Update Kubernetes Manifests
Update image references in `k8s/backend-deployment.yaml` and `k8s/frontend-deployment.yaml`:
```yaml
image: <ACCOUNT-ID>.dkr.ecr.us-west-2.amazonaws.com/workflow-backend:latest
```

#### Step 5: Deploy Application
```bash
# Deploy using the deployment script
./k8s/deploy.sh

# Or deploy manually as shown in Step 5 of local deployment
```

#### Step 6: Configure Domain and SSL (Optional)
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update k8s/ingress.yaml with your domain and apply
kubectl apply -f k8s/ingress.yaml
```

### Google GKE Deployment

#### Step 1: Create GKE Cluster
```bash
# Set project and zone
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/zone us-central1-a

# Create cluster
gcloud container clusters create workflow-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=5

# Get credentials
gcloud container clusters get-credentials workflow-cluster
```

#### Step 2: Build and Push to GCR
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and tag
docker build -t workflow-backend:latest ./backend
docker build -t workflow-frontend:latest ./frontend

docker tag workflow-backend:latest gcr.io/YOUR_PROJECT_ID/workflow-backend:latest
docker tag workflow-frontend:latest gcr.io/YOUR_PROJECT_ID/workflow-frontend:latest

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/workflow-backend:latest
docker push gcr.io/YOUR_PROJECT_ID/workflow-frontend:latest
```

#### Step 3: Deploy Application
Follow the same deployment steps as local/AWS, but update image references to use GCR.

### Azure AKS Deployment

#### Step 1: Create AKS Cluster
```bash
# Create resource group
az group create --name workflow-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group workflow-rg \
  --name workflow-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group workflow-rg --name workflow-cluster
```

#### Step 2: Build and Push to ACR
```bash
# Create ACR
az acr create --resource-group workflow-rg --name workflowregistry --sku Basic

# Attach ACR to AKS
az aks update --resource-group workflow-rg --name workflow-cluster --attach-acr workflowregistry

# Login to ACR
az acr login --name workflowregistry

# Build and push
docker build -t workflow-backend:latest ./backend
docker build -t workflow-frontend:latest ./frontend

docker tag workflow-backend:latest workflowregistry.azurecr.io/workflow-backend:latest
docker tag workflow-frontend:latest workflowregistry.azurecr.io/workflow-frontend:latest

docker push workflowregistry.azurecr.io/workflow-backend:latest
docker push workflowregistry.azurecr.io/workflow-frontend:latest
```

---

## Deployment Architecture

### Components

1. **Frontend (React + Vite + Nginx)**
   - 2 replicas (autoscaling: 2-5)
   - LoadBalancer service
   - Resource limits: 128Mi-256Mi RAM, 100m-200m CPU

2. **Backend (FastAPI + Python)**
   - 2 replicas (autoscaling: 2-10)
   - ClusterIP service
   - Resource limits: 512Mi-1Gi RAM, 250m-1000m CPU
   - Persistent volume for ChromaDB

3. **Database (PostgreSQL)**
   - 1 replica (StatefulSet-like behavior)
   - ClusterIP service
   - Persistent volume for data (10Gi)
   - Resource limits: 256Mi-512Mi RAM, 250m-500m CPU

### Networking

```
Internet → LoadBalancer/Ingress → Frontend (Port 80)
                                → Backend (Port 8000) → PostgreSQL (Port 5432)
```

### Storage

- **postgres-pvc**: 10Gi for PostgreSQL data
- **chroma-pvc**: 5Gi for ChromaDB vector store

---

## Configuration

### Environment Variables (Secrets)

Stored in `k8s/secrets.yaml`:
- `OPENAI_API_KEY`: OpenAI API key
- `GEMINI_API_KEY`: Google Gemini API key
- `SERPAPI_KEY`: SerpAPI key for web search
- `BRAVE_API_KEY`: Brave Search API key
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name
- `DATABASE_URL`: Full database connection string

### ConfigMap

Stored in `k8s/configmap.yaml`:
- `CHROMA_PATH`: Path for ChromaDB storage
- `POSTGRES_HOST`: PostgreSQL service name
- `POSTGRES_PORT`: PostgreSQL port

### Resource Limits

Adjust in deployment files based on your needs:
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## Monitoring and Maintenance

### View Logs

```bash
# View all pods
kubectl get pods -n workflow-app

# View logs for a specific pod
kubectl logs <pod-name> -n workflow-app

# Follow logs
kubectl logs -f <pod-name> -n workflow-app

# View logs for all backend pods
kubectl logs -l app=backend -n workflow-app --tail=100
```

### Check Pod Status

```bash
# Get all resources
kubectl get all -n workflow-app

# Describe a pod (for troubleshooting)
kubectl describe pod <pod-name> -n workflow-app

# Get events
kubectl get events -n workflow-app --sort-by='.lastTimestamp'
```

### Scale Deployments

```bash
# Manual scaling
kubectl scale deployment backend --replicas=5 -n workflow-app

# Check HPA status
kubectl get hpa -n workflow-app
```

### Update Deployment

```bash
# After building new images
kubectl rollout restart deployment/backend -n workflow-app
kubectl rollout restart deployment/frontend -n workflow-app

# Check rollout status
kubectl rollout status deployment/backend -n workflow-app

# View rollout history
kubectl rollout history deployment/backend -n workflow-app

# Rollback if needed
kubectl rollout undo deployment/backend -n workflow-app
```

### Database Backup

```bash
# Create a backup job
kubectl exec -it <postgres-pod-name> -n workflow-app -- pg_dump -U workflowuser workflows > backup.sql

# Restore from backup
kubectl exec -i <postgres-pod-name> -n workflow-app -- psql -U workflowuser workflows < backup.sql
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n workflow-app

# Common causes:
# - Image pull errors: Check image name and registry access
# - Resource constraints: Check node resources
# - Volume mount issues: Check PVC status
```

#### 2. Database Connection Errors

```bash
# Check if PostgreSQL is running
kubectl get pods -l app=postgres -n workflow-app

# Test connection from backend pod
kubectl exec -it <backend-pod> -n workflow-app -- env | grep DATABASE

# Check PostgreSQL logs
kubectl logs <postgres-pod> -n workflow-app
```

#### 3. Image Pull Errors

```bash
# For local development with Minikube
eval $(minikube docker-env)
docker images | grep workflow

# For cloud deployment, check registry authentication
kubectl describe pod <pod-name> -n workflow-app | grep -A 10 Events
```

#### 4. Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n workflow-app

# Test service internally
kubectl run -it --rm debug --image=alpine --restart=Never -n workflow-app -- sh
# Inside the pod:
wget -O- http://backend-service:8000/health
```

#### 5. Persistent Volume Issues

```bash
# Check PVC status
kubectl get pvc -n workflow-app

# Check PV status
kubectl get pv

# Describe PVC for more details
kubectl describe pvc postgres-pvc -n workflow-app
```

### Debugging Commands

```bash
# Get a shell in a running pod
kubectl exec -it <pod-name> -n workflow-app -- /bin/bash

# Port forward a service for local testing
kubectl port-forward svc/backend-service 8000:8000 -n workflow-app

# View resource usage
kubectl top nodes
kubectl top pods -n workflow-app

# Check cluster info
kubectl cluster-info
kubectl get nodes
```

### Clean Up

```bash
# Use the cleanup script
chmod +x k8s/cleanup.sh
./k8s/cleanup.sh

# Or manually delete resources
kubectl delete namespace workflow-app

# For complete cleanup including PVs
kubectl delete pv --all
```

---

## Performance Tuning

### Horizontal Pod Autoscaling

The HPA configuration automatically scales pods based on CPU and memory usage. Adjust thresholds in `k8s/hpa.yaml`:

```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale when CPU > 70%
```

### Resource Optimization

Monitor and adjust resources:
```bash
# Check actual resource usage
kubectl top pods -n workflow-app

# Adjust deployment resources accordingly
kubectl edit deployment backend -n workflow-app
```

---

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to version control
   - Use external secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)
   - Rotate API keys regularly

2. **Network Policies**
   - Implement network policies to restrict pod-to-pod communication
   - Use service mesh for advanced security (Istio, Linkerd)

3. **RBAC**
   - Configure Role-Based Access Control
   - Use service accounts with minimal permissions

4. **Image Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Keep dependencies updated

---

## Support and Contribution

For issues or questions:
- Check logs first: `kubectl logs <pod-name> -n workflow-app`
- Review events: `kubectl get events -n workflow-app`
- Consult documentation: This README and Kubernetes docs

---

## License

[Your License Here]
