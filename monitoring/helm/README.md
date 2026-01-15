# Helm-based Monitoring (Optional)

These values files are overlays for popular upstream charts. Add the repos once, then install:

```sh
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add elastic https://helm.elastic.co
helm repo update
```

## Prometheus
```sh
helm upgrade --install prometheus prometheus-community/prometheus \
  -f monitoring/helm/values-prometheus.yaml
```

## Grafana
```sh
helm upgrade --install grafana grafana/grafana \
  -f monitoring/helm/values-grafana.yaml
```

Default creds: user `admin`, password from the release secret (or `admin123` override). Port-forward:
```sh
kubectl port-forward svc/grafana 3000:80
```

## Elasticsearch
```sh
helm upgrade --install elasticsearch elastic/elasticsearch \
  -f monitoring/helm/values-elasticsearch.yaml
```

## Logstash
```sh
helm upgrade --install logstash elastic/logstash \
  -f monitoring/helm/values-logstash.yaml
```

## Kibana
```sh
helm upgrade --install kibana elastic/kibana \
  -f monitoring/helm/values-kibana.yaml
```

## Fluent Bit (log shipping)
```sh
helm upgrade --install fluent-bit fluent/fluent-bit \
  -f monitoring/helm/values-fluent-bit.yaml \
  --repo https://fluent.github.io/helm-charts
```

## Notes
- These values keep defaults minimal and unauthenticated for cluster-internal use; harden for production (TLS, RBAC, storage sizing, passwords via secrets).
- Adjust the backend metrics endpoint in Prometheus scrape configs (both Helm and raw manifests) if your service name/port differs.
- For Grafana dashboards, import JSONs or point `dashboardsProvider` to a ConfigMap.
