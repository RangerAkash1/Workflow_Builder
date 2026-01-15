#!/bin/bash
# Cleanup all workflow application resources from Kubernetes

echo "======================================="
echo "Cleaning up Workflow App from Kubernetes"
echo "======================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

read -p "This will delete all workflow app resources. Continue? (yes/no): " response
if [ "$response" != "yes" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

echo ""
echo "Deleting resources..."

# Delete in reverse order
kubectl delete -f k8s/hpa.yaml --ignore-not-found=true
kubectl delete -f k8s/ingress.yaml --ignore-not-found=true
kubectl delete -f k8s/frontend-deployment.yaml --ignore-not-found=true
kubectl delete -f k8s/backend-deployment.yaml --ignore-not-found=true
kubectl delete -f k8s/postgres-deployment.yaml --ignore-not-found=true
kubectl delete -f k8s/persistent-volumes.yaml --ignore-not-found=true
kubectl delete -f k8s/configmap.yaml --ignore-not-found=true
kubectl delete -f k8s/secrets.yaml --ignore-not-found=true

read -p "Do you want to delete the namespace (this will delete everything)? (yes/no): " ns_response
if [ "$ns_response" = "yes" ]; then
    kubectl delete namespace workflow-app
    echo "Namespace deleted"
else
    echo "Namespace preserved"
fi

echo ""
echo "Cleanup completed!"
