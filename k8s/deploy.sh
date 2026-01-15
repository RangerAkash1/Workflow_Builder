#!/bin/bash
# Deploy the workflow application to Kubernetes

set -e

echo "======================================="
echo "Deploying Workflow App to Kubernetes"
echo "======================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check cluster connection
echo "Checking cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster"
    exit 1
fi
echo "✓ Connected to cluster"

# Apply namespace
echo ""
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply secrets and configmap
echo ""
echo "Applying secrets and configmaps..."
echo "WARNING: Make sure to update k8s/secrets.yaml with your actual API keys!"
read -p "Have you updated the secrets.yaml file? (yes/no): " response
if [ "$response" != "yes" ]; then
    echo "Please update k8s/secrets.yaml with your API keys and run this script again"
    exit 1
fi
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# Apply persistent volumes
echo ""
echo "Creating persistent volume claims..."
kubectl apply -f k8s/persistent-volumes.yaml

# Wait for PVCs to be bound
echo "Waiting for PVCs to be ready..."
kubectl wait --for=condition=Bound pvc/postgres-pvc -n workflow-app --timeout=60s
kubectl wait --for=condition=Bound pvc/chroma-pvc -n workflow-app --timeout=60s
echo "✓ PVCs are ready"

# Deploy PostgreSQL
echo ""
echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres-deployment.yaml

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n workflow-app --timeout=300s
echo "✓ PostgreSQL is ready"

# Deploy backend
echo ""
echo "Deploying backend..."
kubectl apply -f k8s/backend-deployment.yaml

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n workflow-app --timeout=300s
echo "✓ Backend is ready"

# Deploy frontend
echo ""
echo "Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yaml

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n workflow-app --timeout=300s
echo "✓ Frontend is ready"

# Apply HPA (optional)
echo ""
echo "Applying Horizontal Pod Autoscalers..."
kubectl apply -f k8s/hpa.yaml

# Apply ingress (optional)
read -p "Do you want to deploy the ingress? (yes/no): " ingress_response
if [ "$ingress_response" = "yes" ]; then
    echo "Deploying ingress..."
    kubectl apply -f k8s/ingress.yaml
fi

echo ""
echo "======================================="
echo "Deployment completed successfully!"
echo "======================================="
echo ""
echo "Checking deployment status..."
kubectl get all -n workflow-app

echo ""
echo "To access the application:"
echo "  - Get the service URL: kubectl get svc frontend-service -n workflow-app"
echo "  - Port forward: kubectl port-forward svc/frontend-service 8080:80 -n workflow-app"
echo "  - Then access: http://localhost:8080"
