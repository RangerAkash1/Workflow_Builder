# Workflow Application - Deployment Guide

Complete containerization and Kubernetes deployment setup for the Workflow Application.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Support](#support)

## 🎯 Overview

This project includes comprehensive deployment configurations for containerizing and deploying the Workflow Application:

- **Docker Support**: Complete Dockerfiles for frontend and backend
- **Docker Compose**: Local development with all services
- **Kubernetes Manifests**: Production-ready K8s configurations
- **Helm Charts**: Package manager support for easy deployment
- **Multi-Cloud Ready**: AWS EKS, GCP GKE, Azure AKS support

### Architecture

```
┌─────────────────────────────────────────────┐
│              Load Balancer / Ingress         │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼────┐      ┌───▼────┐
   │Frontend│      │Backend │
   │ (Nginx)│      │(FastAPI)│
   │  :80   │      │  :8000  │
   └────────┘      └────┬────┘
                        │
                   ┌────▼────┐
                   │PostgreSQL│
                   │  :5432   │
                   └──────────┘
```

### Components

- **Frontend**: React + Vite + Nginx (Multi-stage build)
- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL 15
- **Vector Store**: ChromaDB
- **Orchestration**: Kubernetes + Helm

## 📦 Prerequisites

### Required

- **Docker**: v20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **kubectl**: v1.24+ ([Install kubectl](https://kubernetes.io/docs/tasks/tools/))
- **Kubernetes Cluster**: One of:
  - Minikube (local development)
  - AWS EKS (production)
  - Google GKE (production)
  - Azure AKS (production)

### Optional

- **Helm**: v3.8+ ([Install Helm](https://helm.sh/docs/intro/install/))
- **Docker Compose**: v2.0+ (usually included with Docker Desktop)
- **Minikube**: For local Kubernetes cluster

### API Keys

You'll need API keys for the following services:
- OpenAI API
- Google Gemini API
- SerpAPI (for web search)
- Brave Search API

## 🚀 Quick Start

### Option 1: Docker Compose (Fastest)

Perfect for local development and testing:

```bash
# 1. Clone and navigate to project
cd Round-1_AI_Planet

# 2. Create .env file from example
copy .env.example .env  # Windows
cp .env.example .env    # Linux/macOS

# 3. Update .env with your API keys

# 4. Start all services
docker-compose up -d

# 5. Access the application
# Frontend: http://localhost
# Backend: http://localhost:8000
# Database: localhost:5432
```

### Option 2: Minikube (Kubernetes Local)

For testing Kubernetes deployment locally:

```bash
# 1. Start Minikube
minikube start --cpus=4 --memory=8192 --disk-size=20g

# 2. Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server

# 3. Configure Docker to use Minikube
eval $(minikube docker-env)  # Linux/macOS
& minikube -p minikube docker-env --shell powershell | Invoke-Expression  # Windows

# 4. Build Docker images
./build-images.sh    # Linux/macOS
build-images.bat     # Windows

# 5. Update API keys in k8s/secrets.yaml

# 6. Deploy to Kubernetes
chmod +x k8s/deploy.sh  # Linux/macOS only
./k8s/deploy.sh

# 7. Access the application
minikube service frontend-service -n workflow-app
```

### Option 3: Helm (Recommended for Production)

Easiest way to manage Kubernetes deployments:

```bash
# 1. Update values in helm/workflow-app/values.yaml

# 2. Install with Helm
helm install workflow-app ./helm/workflow-app \
  --namespace workflow-app \
  --create-namespace \
  --set backend.secrets.openaiApiKey="your-key" \
  --set backend.secrets.geminiApiKey="your-key"

# 3. Check deployment status
helm status workflow-app -n workflow-app
kubectl get all -n workflow-app
```

## 🎨 Deployment Options

### Local Development

**Docker Compose** (Recommended)
```bash
docker-compose up -d
```
- ✅ Fastest setup
- ✅ Easy to modify
- ✅ Good for development
- ❌ Not production-ready

### Local Kubernetes

**Minikube**
```bash
minikube start
eval $(minikube docker-env)
./build-images.sh
./k8s/deploy.sh
```
- ✅ Test K8s configurations
- ✅ Matches production setup
- ✅ Learn Kubernetes
- ⚠️ Requires more resources

### Cloud Deployment

**AWS EKS**
```bash
eksctl create cluster --name workflow-cluster
# Build and push to ECR
# Deploy with kubectl or Helm
```

**Google GKE**
```bash
gcloud container clusters create workflow-cluster
# Build and push to GCR
# Deploy with kubectl or Helm
```

**Azure AKS**
```bash
az aks create --name workflow-cluster
# Build and push to ACR
# Deploy with kubectl or Helm
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed cloud deployment instructions.

## 📚 Documentation

Comprehensive guides for all deployment scenarios:

### Main Guides

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete Kubernetes deployment guide
  - Minikube setup
  - Cloud deployment (AWS EKS, GCP GKE, Azure AKS)
  - Configuration options
  - Monitoring and maintenance
  - Troubleshooting

- **[HELM-GUIDE.md](helm/HELM-GUIDE.md)** - Helm chart documentation
  - Installation instructions
  - Configuration options
  - Upgrade and rollback
  - Multi-environment setup
  - Best practices

- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Command cheat sheet
  - Docker commands
  - Kubernetes commands
  - Helm commands
  - Common workflows
  - Troubleshooting tips

- **[README-DOCKER.md](README-DOCKER.md)** - Docker and Docker Compose guide
  - Local development setup
  - Docker commands
  - Service configuration

## 📁 Project Structure

```
Round-1_AI_Planet/
├── backend/                    # Backend application
│   ├── app/
│   │   ├── main.py            # FastAPI application
│   │   ├── database.py        # Database configuration
│   │   └── config.py          # Application config
│   ├── Dockerfile             # Backend container image
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # Frontend application
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── components/        # React components
│   │   └── main.jsx           # Entry point
│   ├── Dockerfile             # Frontend container image (multi-stage)
│   ├── nginx.conf             # Nginx configuration
│   └── package.json           # Node dependencies
│
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml         # Namespace definition
│   ├── secrets.yaml           # Secrets (API keys, passwords)
│   ├── configmap.yaml         # Configuration
│   ├── persistent-volumes.yaml # Storage definitions
│   ├── postgres-deployment.yaml # Database deployment
│   ├── backend-deployment.yaml  # Backend deployment
│   ├── frontend-deployment.yaml # Frontend deployment
│   ├── ingress.yaml           # Ingress rules
│   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   ├── deploy.sh              # Deployment script
│   └── cleanup.sh             # Cleanup script
│
├── helm/                       # Helm charts
│   └── workflow-app/
│       ├── Chart.yaml         # Chart metadata
│       ├── values.yaml        # Default values
│       └── templates/         # K8s templates
│           ├── postgres.yaml
│           ├── backend.yaml
│           ├── frontend.yaml
│           ├── ingress.yaml
│           └── hpa.yaml
│
├── docker-compose.yml          # Docker Compose configuration
├── build-images.sh            # Build script (Linux/macOS)
├── build-images.bat           # Build script (Windows)
├── .env.example               # Environment variables template
├── DEPLOYMENT.md              # Kubernetes deployment guide
├── QUICK-REFERENCE.md         # Command reference
└── README-DEPLOYMENT.md       # This file
```

## 🔧 Configuration

### Environment Variables

Update [k8s/secrets.yaml](k8s/secrets.yaml) or [helm/workflow-app/values.yaml](helm/workflow-app/values.yaml):

```yaml
# Required API Keys
OPENAI_API_KEY: "your-openai-api-key"
GEMINI_API_KEY: "your-gemini-api-key"
SERPAPI_KEY: "your-serpapi-key"
BRAVE_API_KEY: "your-brave-api-key"

# Database Configuration
POSTGRES_USER: "workflowuser"
POSTGRES_PASSWORD: "change-this-password"
POSTGRES_DB: "workflows"
```

### Resource Configuration

Adjust resources in deployment files:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Scaling Configuration

Configure autoscaling in [k8s/hpa.yaml](k8s/hpa.yaml):

```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
```

## 🔍 Monitoring

### Check Application Status

```bash
# View all resources
kubectl get all -n workflow-app

# Check pod logs
kubectl logs -f <pod-name> -n workflow-app

# Check resource usage
kubectl top pods -n workflow-app

# View events
kubectl get events -n workflow-app --sort-by='.lastTimestamp'
```

### Access Services

```bash
# Port forward to access locally
kubectl port-forward svc/frontend-service 8080:80 -n workflow-app
kubectl port-forward svc/backend-service 8000:8000 -n workflow-app

# For Minikube
minikube service frontend-service -n workflow-app --url
```

## 🧪 Testing

### Verify Docker Images

```bash
# List images
docker images | grep workflow

# Test backend locally
docker run -p 8000:8000 workflow-backend:latest

# Test frontend locally
docker run -p 80:80 workflow-frontend:latest
```

### Verify Kubernetes Deployment

```bash
# Check pod status
kubectl get pods -n workflow-app

# Test backend health
kubectl port-forward svc/backend-service 8000:8000 -n workflow-app
curl http://localhost:8000/health

# Test frontend
kubectl port-forward svc/frontend-service 8080:80 -n workflow-app
curl http://localhost:8080
```

## 🐛 Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl describe pod <pod-name> -n workflow-app
kubectl logs <pod-name> -n workflow-app
```

**Image pull errors**
```bash
# For Minikube, ensure using Minikube's Docker daemon
eval $(minikube docker-env)
./build-images.sh
```

**Database connection errors**
```bash
# Check PostgreSQL logs
kubectl logs -l app=postgres -n workflow-app

# Verify connection string
kubectl get secret workflow-secrets -n workflow-app -o yaml
```

**Service not accessible**
```bash
# Check service endpoints
kubectl get endpoints -n workflow-app

# Port forward to test
kubectl port-forward svc/frontend-service 8080:80 -n workflow-app
```

See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) for detailed troubleshooting guide.

## 🧹 Cleanup

### Docker Compose

```bash
# Stop and remove containers
docker-compose down

# Also remove volumes
docker-compose down -v
```

### Kubernetes

```bash
# Using cleanup script
./k8s/cleanup.sh

# Or manually
kubectl delete namespace workflow-app

# For Minikube
minikube delete
```

### Helm

```bash
# Uninstall release
helm uninstall workflow-app -n workflow-app

# Delete namespace
kubectl delete namespace workflow-app
```

## 📊 Performance Tuning

### Horizontal Pod Autoscaling

Automatically scales pods based on CPU/memory:

```yaml
# k8s/hpa.yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
```

### Resource Optimization

Monitor and adjust resources:

```bash
# Check actual usage
kubectl top pods -n workflow-app

# Update deployment
kubectl edit deployment backend -n workflow-app
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Use external secret managers
2. **Update secrets.yaml** with strong passwords
3. **Use specific image tags** instead of `latest` in production
4. **Enable RBAC** for cluster access control
5. **Use network policies** to restrict pod communication
6. **Scan images** for vulnerabilities
7. **Keep dependencies updated**
8. **Enable TLS/SSL** for production deployments

## 📞 Support

### Getting Help

1. **Check logs**: `kubectl logs <pod-name> -n workflow-app`
2. **Review events**: `kubectl get events -n workflow-app`
3. **Consult documentation**:
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
   - [HELM-GUIDE.md](helm/HELM-GUIDE.md) - Helm documentation
   - [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Command reference

### Useful Commands

See [QUICK-REFERENCE.md](QUICK-REFERENCE.md) for a comprehensive list of commands.

## 🎓 Learning Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## 📝 License

[Your License Here]

## 🙏 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Quick Links:**
- [Full Deployment Guide](DEPLOYMENT.md)
- [Helm Chart Guide](helm/HELM-GUIDE.md)
- [Quick Reference](QUICK-REFERENCE.md)
- [Docker Guide](README-DOCKER.md)
