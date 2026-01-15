# Monitoring & Logging (Optional)

This folder separates monitoring/logging assets from the core app deployment. Two options are provided:

- **Raw Kubernetes manifests** in `k8s/` for a lightweight, inspectable setup of Prometheus, Grafana, Elasticsearch, Logstash, Kibana, and Fluent Bit.
- **Helm values** in `helm/` to deploy the same stack using upstream community charts (recommended for production).

## What is covered
- **Metrics**: Prometheus scrapes application, database, and middleware HTTP metrics endpoints; Grafana visualizes them.
- **Logs**: Fluent Bit tails container logs, ships to Logstash, which forwards to Elasticsearch; Kibana provides log search and dashboards.

## Assumptions
- The app exposes Prometheus metrics at `/metrics` on the backend service (default `backend:8000`).
- Kubernetes cluster has storage provisioning (for Elasticsearch).
- These assets are **optional** and can be deployed alongside the existing Helm/k8s app deployments.

## Deploy (manifests)
```sh
kubectl apply -f monitoring/k8s/
```
Access:
- Prometheus: `kubectl port-forward svc/prometheus 9090:9090`
- Grafana: `kubectl port-forward svc/grafana 3000:3000` (user: `admin`, password: `admin123` by default)
- Kibana: `kubectl port-forward svc/kibana 5601:5601`

## Deploy (Helm)
See [helm/README.md](helm/README.md) for chart installs and values overrides.

## Removing
```sh
kubectl delete -f monitoring/k8s/
```

## Next steps
- Wire your services to expose metrics; adjust scrape targets in `prometheus-config.yaml`.
- Harden credentials, TLS, storage classes, and resource limits before production use.
- Add Grafana dashboards tailored to your domain and middleware.
