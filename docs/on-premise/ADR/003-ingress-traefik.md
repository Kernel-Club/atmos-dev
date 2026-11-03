# ADR-003: Ingress and Reverse Proxy - Traefik

## Context

Project Atmos on-premise needs two entry points:

- **cluster ingress:** `atmos.lan` (`/` to the frontend, `/api` to the backend) and `grafana.atmos.lan`;
- **reverse proxy on `tools`:** HTTPS for `jenkins.atmos.lan` and `nexus.atmos.lan`, so Jenkins (8080) and Nexus (8081) are not exposed directly.

Both must use little RAM and be installed automatically.

## Decision

We choose **Traefik** for both entry points.

- **In the cluster:** the Traefik that k3s installs by default. It is exposed by the k3s load balancer (ServiceLB) on ports 80 and 443. Its settings (memory limits) are set with a `HelmChartConfig`, placed by Ansible.
- **On `tools`:** Traefik in a Docker container with file configuration, installed by Ansible. It terminates HTTPS with a self-signed certificate. Jenkins and Nexus listen only on `127.0.0.1`.

The application uses standard Kubernetes `Ingress` objects with `ingressClassName: traefik`. No Traefik-specific resources (`IngressRoute`) are used in the Helm chart.

## Alternatives

- **NGINX Ingress Controller in the cluster:** well known, but Traefik in k3s would have to be disabled and NGINX installed and upgraded separately, with its own RAM use.
- **Nginx on `tools`:** works well as a reverse proxy, but it would be a second proxy technology to learn and configure.

## Why

- **Already in k3s:** no separate installation and no separate upgrades for the cluster ingress.
- **One tool:** the same proxy in the cluster and on `tools`.
- **Low resources:** one Go binary, small memory use.
- **Portable chart:** standard `Ingress` objects work with any ingress controller.

## Consequences

- **Positive:** fewer components to install and maintain.
- **Positive:** Jenkins and Nexus are reached only through HTTPS.
- **Trade-off:** the Traefik version in the cluster follows the k3s version. Upgrading Traefik means upgrading k3s.
- **Trade-off:** self-signed certificates cause browser warnings until the certificate is trusted on the admin machine.
- **Trade-off:** the application is served over plain HTTP (`http://atmos.lan`) inside the home network.
