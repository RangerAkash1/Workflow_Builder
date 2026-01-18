#!/bin/bash
# Build Docker images for the workflow application

echo "================================"
echo "Building Workflow Docker Images"
echo "================================"

# Set image tag (default to latest, can be overridden)
TAG=${1:-latest}
echo "Using tag: $TAG"

# Build backend image
echo ""
echo "Building backend image..."
docker build -t workflow-backend:$TAG ./backend
if [ $? -eq 0 ]; then
    echo "✓ Backend image built successfully"
else
    echo "✗ Failed to build backend image"
    exit 1
fi

# Build frontend image
echo ""
echo "Building frontend image..."
docker build -t workflow-frontend:$TAG ./frontend
if [ $? -eq 0 ]; then
    echo "✓ Frontend image built successfully"
else
    echo "✗ Failed to build frontend image"
    exit 1
fi

echo ""
echo "================================"
echo "All images built successfully!"
echo "================================"
echo ""
echo "Images created:"
docker images | grep "workflow-"

echo ""
echo "To push to a registry, tag and push:"
echo "  docker tag workflow-backend:$TAG your-registry/workflow-backend:$TAG"
echo "  docker tag workflow-frontend:$TAG your-registry/workflow-frontend:$TAG"
echo "  docker push your-registry/workflow-backend:$TAG"
echo "  docker push your-registry/workflow-frontend:$TAG"
