# Project Atmos: On-Premise Architecture

## Overview

The Project Atmos application (React, FastAPI, MongoDB, Redis) runs in Kubernetes on three virtual machines on one personal PC. No cloud services are used.
The admin machine manages everything over SSH. Code is built by Jenkins and delivered by Flux. Traefik is the entry point: the ingress controller of the cluster and the reverse proxy for the tools.

The application code is the same as in the cloud version (`project-atmos-dev`). Only the platform around it is different.

## Host and virtual machines

Host: Windows 11 Pro, Intel i5-12100F (4 cores / 8 threads), 16 GB RAM, 500 GB disk. Hypervisor: VirtualBox.
VMs are created once by hand (Ubuntu Server 24.04 LTS) and configured by Ansible.

| VM | IP (example) | vCPU | RAM | Disk | Runs |
|---|---|---|---|---|---|
| `tools` | 192.168.1.53 | 3 | 5 GB | 80 GB | Jenkins, Docker, Nexus, Traefik, node-exporter |
| `k8s-cp` | 192.168.1.51 | 2 | 2.5 GB | 40 GB | k3s server, node-exporter |
| `k8s-w1` | 192.168.1.52 | 2 | 4 GB | 60 GB | k3s agent, node-exporter |
| Total | | 7 | 11.5 GB | 180 GB | |

Windows keeps about 4.5 GB of RAM.
The application, Flux, Traefik and monitoring run as pods in the cluster. The scheduler uses both Kubernetes nodes, and every pod has memory limits.

Start: VirtualBox "Start headless" in the order `tools`, `k8s-cp`, `k8s-w1`.
Stop: the Ansible playbook `stop.yml`. Stop the VMs before games or sleep. When the VMs are stopped, nothing runs on the host.

## Network

- One bridged adapter per VM: the VMs are normal devices in the home network (same router, Ethernet).
- Static IPs outside the router DHCP range. SSH with keys only, and only from the admin machine.
- Names are set in the hosts file of the admin machine (no DNS server):

| Name | Address | Served by |
|---|---|---|
| `atmos.lan` | 192.168.1.52 | Traefik in the cluster (the application) |
| `grafana.atmos.lan` | 192.168.1.52 | Traefik in the cluster |
| `jenkins.atmos.lan` | 192.168.1.53 | Traefik on `tools` (HTTPS) |
| `nexus.atmos.lan` | 192.168.1.53 | Traefik on `tools` (HTTPS) |

- Jenkins (8080) and the Nexus web interface (8081) listen only on `127.0.0.1`. Only Traefik on `tools` reaches them.
- The Kubernetes API (6443) is reached directly from the admin machine.
- Images go to the Nexus registry on port 5000 over plain HTTP inside the home network. Docker on `tools`, k3s on the nodes and the Flux image scanner are configured to allow it.
- Firewall: `ufw` on every VM (only the ports of its role are open), Kubernetes NetworkPolicy in the cluster. The home router forwards no ports. Nothing is opened from the internet.

## Tools

| Area | Tool |
|---|---|
| VM configuration | Ansible (from the admin machine), versions pinned in `group_vars` |
| Kubernetes | k3s |
| Ingress | Traefik bundled with k3s; exposed by the k3s load balancer (ServiceLB) on ports 80/443; memory limits set with a `HelmChartConfig` |
| Reverse proxy | Traefik on `tools` (Docker container, file configuration): HTTPS (self-signed certificate) in front of Jenkins and Nexus |
| Storage | k3s local-path (MongoDB data lives on the `k8s-w1` disk) |
| CI | Jenkins (`Jenkinsfile` in `project-atmos-onprem-jenkins`) |
| Image build | Docker Engine |
| Image registry | Nexus Repository (Docker repo, port 5000) |
| Packaging | Helm chart |
| GitOps / CD | Flux with image automation (deploy key with write access to the gitops repo only) |
| Git | GitHub |
| Firewall | `ufw` on every VM; NetworkPolicy (MongoDB and Redis accept traffic only from the backend) |
| Metrics | Prometheus (retention about 3 days) |
| Dashboards | Grafana |
| Cluster state | kube-state-metrics |
| VM metrics | node-exporter on all three VMs (installed by Ansible) |
| Logs | `kubectl logs` only: no log collector or log storage, to keep RAM free on the VMs |
| Secrets | Ansible Vault (platform, Nexus and Flux credentials); app secrets (OpenWeather key, MongoDB password) are Kubernetes Secrets created once by hand, never in Git |

Monitoring runs in the namespace `monitoring`, is installed by Flux, and needs about 1 GB of RAM.

**Why k3s:** it is a certified Kubernetes distribution built for small servers: one binary, about 1 GB of RAM for the control plane, a real multi-node cluster across several VMs, and it survives reboots. minikube is a local tool for one developer machine and does not fit a three-VM cluster.

**Why Traefik:** k3s installs and upgrades it by itself, so the cluster needs no separate ingress controller. The same tool also runs on `tools`, so there is one proxy to learn and configure instead of two. The application uses standard Kubernetes `Ingress` objects (`ingressClassName: traefik`), so the chart does not depend on Traefik-specific resources.

## Delivery flow

**Developer → GitHub → Jenkins → Nexus → Flux → gitops repo → cluster → Traefik → browser**

| Step | Where | What happens |
|---|---|---|
| 1 | Jenkins (`tools`) | polls `project-atmos-dev` (branch `develop`) and starts a build on a new commit |
| 2 | Jenkins (`tools`) | runs the `Jenkinsfile` from `project-atmos-onprem-jenkins`: lint, tests, image build |
| 3 | Nexus (`tools`) | receives the images with the tag `build-<number>-<sha6>` |
| 4 | Flux (cluster) | polls Nexus and sees the new tag |
| 5 | GitHub | Flux commits the new tag to `project-atmos-onprem-gitops` |
| 6 | Cluster | Flux upgrades the Helm release; the pods are replaced |
| 7 | Browser | `http://atmos.lan`: Traefik routes `/api` to the backend and `/` to the frontend |

Jenkins does CI. Flux does CD. Jenkins has no access to the cluster.

The GitHub Actions workflow in `project-atmos-dev` is for the cloud and starts only by hand, so it does not run on the same commits.

## Repositories

| Repo | Content |
|---|---|
| `project-atmos-dev` | application, Dockerfiles; shared with the cloud version, nothing on-premise specific |
| `project-atmos-onprem-jenkins` | `Jenkinsfile` (checks out `project-atmos-dev` and builds it), later Jenkins configuration as code |
| `project-atmos-onprem-provision` | Ansible: inventory, roles (`common` with `ufw` and node-exporter, k3s, docker, nexus, jenkins, traefik), playbooks (`site.yml`, `stop.yml`) |
| `project-atmos-onprem-gitops` | Flux configuration, Helm chart, ingress, monitoring manifests, NetworkPolicy, values |

The Jenkins job is "Pipeline script from SCM" pointing to `project-atmos-onprem-jenkins`. The `Jenkinsfile` checks out `project-atmos-dev` (branch `develop`) with polling enabled, so a commit to the application starts the build.
