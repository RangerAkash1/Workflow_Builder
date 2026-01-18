# Makefile for Workflow Application Deployment
.PHONY: help build push deploy clean test

# Variables
BACKEND_IMAGE := workflow-backend
FRONTEND_IMAGE := workflow-frontend
TAG := latest
NAMESPACE := workflow-app
HELM_RELEASE := workflow-app

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker targets
build: ## Build Docker images
	@echo "Building Docker images..."
	docker build -t $(BACKEND_IMAGE):$(TAG) ./backend
	docker build -t $(FRONTEND_IMAGE):$(TAG) ./frontend
	@echo "Images built successfully!"

push: ## Push Docker images to registry (requires REGISTRY variable)
	@if [ -z "$(REGISTRY)" ]; then \
		echo "Error: REGISTRY variable not set. Usage: make push REGISTRY=your-registry.com"; \
		exit 1; \
	fi
	@echo "Tagging and pushing images to $(REGISTRY)..."
	docker tag $(BACKEND_IMAGE):$(TAG) $(REGISTRY)/$(BACKEND_IMAGE):$(TAG)
	docker tag $(FRONTEND_IMAGE):$(TAG) $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG)
	docker push $(REGISTRY)/$(BACKEND_IMAGE):$(TAG)
	docker push $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG)
	@echo "Images pushed successfully!"

# Docker Compose targets
up: ## Start services with Docker Compose
	docker-compose up -d

down: ## Stop services with Docker Compose
	docker-compose down

logs: ## View Docker Compose logs
	docker-compose logs -f

restart: ## Restart Docker Compose services
	docker-compose restart

# Kubernetes targets (using kubectl)
k8s-deploy: ## Deploy to Kubernetes using kubectl
	@echo "Deploying to Kubernetes..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/secrets.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/persistent-volumes.yaml
	kubectl apply -f k8s/postgres-deployment.yaml
	kubectl wait --for=condition=ready pod -l app=postgres -n $(NAMESPACE) --timeout=300s
	kubectl apply -f k8s/backend-deployment.yaml
	kubectl wait --for=condition=ready pod -l app=backend -n $(NAMESPACE) --timeout=300s
	kubectl apply -f k8s/frontend-deployment.yaml
	kubectl apply -f k8s/hpa.yaml
	@echo "Deployment completed!"

k8s-status: ## Check Kubernetes deployment status
	kubectl get all -n $(NAMESPACE)

k8s-logs-backend: ## View backend logs
	kubectl logs -f -l app=backend -n $(NAMESPACE)

k8s-logs-frontend: ## View frontend logs
	kubectl logs -f -l app=frontend -n $(NAMESPACE)

k8s-delete: ## Delete Kubernetes resources
	kubectl delete namespace $(NAMESPACE)

# Helm targets
helm-install: ## Install with Helm
	helm install $(HELM_RELEASE) ./helm/workflow-app \
		--namespace $(NAMESPACE) \
		--create-namespace

helm-upgrade: ## Upgrade Helm release
	helm upgrade $(HELM_RELEASE) ./helm/workflow-app \
		--namespace $(NAMESPACE)

helm-uninstall: ## Uninstall Helm release
	helm uninstall $(HELM_RELEASE) -n $(NAMESPACE)

helm-status: ## Check Helm release status
	helm status $(HELM_RELEASE) -n $(NAMESPACE)

helm-lint: ## Lint Helm chart
	helm lint ./helm/workflow-app

# Minikube targets
minikube-start: ## Start Minikube
	minikube start --cpus=4 --memory=8192 --disk-size=20g
	minikube addons enable ingress
	minikube addons enable metrics-server

minikube-stop: ## Stop Minikube
	minikube stop

minikube-delete: ## Delete Minikube cluster
	minikube delete

minikube-docker: ## Configure Docker to use Minikube's daemon
	@echo "Run this command in your shell:"
	@echo "eval \$$(minikube docker-env)"

minikube-service: ## Open frontend service in Minikube
	minikube service frontend-service -n $(NAMESPACE)

# Development targets
dev-backend: ## Run backend locally
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Run frontend locally
	cd frontend && npm run dev

# Port forwarding targets
port-forward-frontend: ## Port forward frontend service
	kubectl port-forward svc/frontend-service 8080:80 -n $(NAMESPACE)

port-forward-backend: ## Port forward backend service
	kubectl port-forward svc/backend-service 8000:8000 -n $(NAMESPACE)

port-forward-db: ## Port forward PostgreSQL service
	kubectl port-forward svc/postgres-service 5432:5432 -n $(NAMESPACE)

# Testing targets
test-backend: ## Test backend health
	curl http://localhost:8000/health

test-frontend: ## Test frontend
	curl http://localhost:8080

# Clean targets
clean-docker: ## Clean Docker resources
	docker system prune -af
	docker volume prune -f

clean-k8s: ## Clean Kubernetes resources
	kubectl delete namespace $(NAMESPACE)

clean-all: clean-docker clean-k8s ## Clean everything

# Info targets
info: ## Display deployment information
	@echo "=== Workflow Application ==="
	@echo "Backend Image: $(BACKEND_IMAGE):$(TAG)"
	@echo "Frontend Image: $(FRONTEND_IMAGE):$(TAG)"
	@echo "Namespace: $(NAMESPACE)"
	@echo "Helm Release: $(HELM_RELEASE)"
	@echo ""
	@echo "Kubernetes Status:"
	@kubectl get all -n $(NAMESPACE) 2>/dev/null || echo "Not deployed to Kubernetes"
