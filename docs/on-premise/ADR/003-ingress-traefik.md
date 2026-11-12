# ADR-003: Ingress and Reverse Proxy - Traefik

## Context

Atmos on-premise needs two entry points:

- **cluster ingress:** `atmos.lan` (`/` to the frontend, `/api` to the backend) and `grafana.atmos.lan`;
- **reverse proxy on `nexus-traefik`:** HTTPS for `jenkins.atmos.lan` (Jenkins on the `jenkins` VM), `nexus.atmos.lan` and the registry `nexus.atmos.lan:5000`, so Jenkins and Nexus are not exposed directly.

Both must use little RAM and be installed automatically.

## Decision

We choose **Traefik** for both entry points.

- **In the cluster:** the Traefik that k3s installs by default. It is exposed by the k3s load balancer (ServiceLB) on ports 80 and 443. Its memory limits are set with a `HelmChartConfig`, placed by Ansible (`roles/k3s/` in `atmos-ansible`).
- **On `nexus-traefik`:** Traefik in a Docker container in the host network, with file configuration, installed by Ansible (`roles/traefik/`). It terminates HTTPS with a self-signed certificate for `*.atmos.lan` on port 443 (web interfaces) and port 5000 (Docker registry). Upstreams: Nexus on `127.0.0.1` of the same VM, Jenkins on `192.168.0.54:8080`. The host network is used because ports published by Docker are not filtered by `ufw`.

The application uses standard Kubernetes `Ingress` objects with `ingressClassName: traefik`. No Traefik-specific resources (`IngressRoute`) are used in the Helm chart.

## Alternatives

- **NGINX Ingress Controller in the cluster:** well known, but Traefik in k3s would have to be disabled and NGINX installed and upgraded separately, with its own RAM use.
- **Nginx on `nexus-traefik`:** works well as a reverse proxy, but it would be a second proxy technology to learn and configure.
- **HTTPS directly in Jenkins and Nexus:** no proxy, but both need Java keystores, and each tool is configured differently.

## Why

- **Already in k3s:** no separate installation and no separate upgrades for the cluster ingress.
- **One tool:** the same proxy in the cluster and on `nexus-traefik`.
- **One place for certificates:** Traefik on `nexus-traefik` holds the certificate for Jenkins, Nexus and the registry.
- **Next to the registry:** image push and pull go from Traefik to Nexus on the same VM, without an extra network hop.
- **Low resources:** one Go binary, small memory use.
- **Portable chart:** standard `Ingress` objects work with any ingress controller.

## Consequences

- **Positive:** fewer components to install and maintain.
- **Positive:** Jenkins, Nexus and the registry are reached only through HTTPS.
- **Trade-off:** the Traefik version in the cluster follows the k3s version. Upgrading Traefik means upgrading k3s.
- **Trade-off:** the self-signed CA must be trusted on the Mac, in Docker on `jenkins`, on the cluster nodes and in Flux.
- **Trade-off:** the application and Grafana are served over plain HTTP inside the home network.
- **Trade-off:** Traefik reaches Jenkins over plain HTTP between two VMs (.53 → .54:8080). `ufw` on `jenkins` accepts port 8080 only from `nexus-traefik`.
- **Trade-off:** Traefik on `nexus-traefik` shares the host network. Its ports must not collide with other services on that VM.
