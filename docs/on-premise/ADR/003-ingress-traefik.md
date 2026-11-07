# ADR-003: Ingress and Reverse Proxy - Traefik

## Context

Project Atmos on-premise needs two entry points:

- **cluster ingress:** `atmos.lan` (`/` to the frontend, `/api` to the backend) and `grafana.atmos.lan`;
- **reverse proxy on `tools`:** HTTPS for `jenkins.atmos.lan`, `nexus.atmos.lan` and the registry `nexus.atmos.lan:5000`, so Jenkins and Nexus are not exposed directly.

Both must use little RAM and be installed automatically.

## Decision

We choose **Traefik** for both entry points.

- **In the cluster:** the Traefik that k3s installs by default. It is exposed by the k3s load balancer (ServiceLB) on ports 80 and 443. Its memory limits are set with a `HelmChartConfig`, placed by Ansible (`roles/k3s/` in `project-atmos-onprem-ansible`).
- **On `tools`:** Traefik in a Docker container in the host network, with file configuration, installed by Ansible (`roles/traefik/`). It terminates HTTPS with a self-signed certificate for `*.atmos.lan` on port 443 (web interfaces) and port 5000 (Docker registry). Jenkins and Nexus are published only on `127.0.0.1`. The host network is used because ports published by Docker are not filtered by `ufw`.

The application uses standard Kubernetes `Ingress` objects with `ingressClassName: traefik`. No Traefik-specific resources (`IngressRoute`) are used in the Helm chart.

## Alternatives

- **NGINX Ingress Controller in the cluster:** well known, but Traefik in k3s would have to be disabled and NGINX installed and upgraded separately, with its own RAM use.
- **Nginx on `tools`:** works well as a reverse proxy, but it would be a second proxy technology to learn and configure.
- **HTTPS directly in Jenkins and Nexus:** no proxy, but both need Java keystores, and each tool is configured differently.

## Why

- **Already in k3s:** no separate installation and no separate upgrades for the cluster ingress.
- **One tool:** the same proxy in the cluster and on `tools`.
- **One place for certificates on `tools`:** Traefik holds the certificate for all tools and the registry.
- **Low resources:** one Go binary, small memory use.
- **Portable chart:** standard `Ingress` objects work with any ingress controller.

## Consequences

- **Positive:** fewer components to install and maintain.
- **Positive:** Jenkins, Nexus and the registry are reached only through HTTPS.
- **Trade-off:** the Traefik version in the cluster follows the k3s version. Upgrading Traefik means upgrading k3s.
- **Trade-off:** the self-signed CA must be trusted on the admin machine, in Docker, on the cluster nodes and in Flux.
- **Trade-off:** the application and Grafana are served over plain HTTP inside the home network.
- **Trade-off:** Traefik on `tools` shares the host network. Its ports must not collide with other services on `tools`.
