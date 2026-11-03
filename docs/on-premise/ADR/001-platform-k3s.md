# ADR-001: Platform - k3s on VirtualBox VMs

## Context

Project Atmos needs an on-premise Kubernetes platform that:

- runs on one personal PC (Windows 11 Pro, 4 cores / 8 threads, 16 GB RAM) without cloud services;
- is a real multi-node cluster, not a single developer sandbox;
- leaves enough RAM for Windows and for the CI tools (Jenkins, Nexus);
- can be stopped completely when the PC is used for other things, and starts again without manual repair;
- is reproducible: the VMs can be rebuilt from Git.

## Decision

We choose **k3s** on **three VirtualBox VMs** (Ubuntu Server 24.04 LTS), configured by **Ansible** from the admin machine.

| VM | Role |
|---|---|
| `tools` | Jenkins, Docker, Nexus, Traefik (outside the cluster) |
| `k8s-cp` | k3s server (control plane) |
| `k8s-w1` | k3s agent (worker) |

The VMs are created once by hand. Everything inside them is installed by Ansible from `project-atmos-onprem-provision`, with versions pinned in `group_vars`. A `clean-os` snapshot of each VM allows a fast rebuild.

CI tools run on a separate VM, outside the cluster, so a broken cluster does not stop builds and Jenkins does not compete with the application for node RAM.

## Alternatives

- **minikube / kind:** one-node tools for a developer machine. They do not give a multi-node cluster across VMs and are not meant to run as a platform.
- **kubeadm:** full upstream Kubernetes, but the control plane alone needs more RAM, and setup and upgrades take much more work.
- **MicroK8s:** comparable, but tied to snap packages; k3s is a single binary and simpler to install with Ansible.
- **One big VM:** less overhead, but no real node separation and no practice with a multi-node cluster.

## Why

- **Low resources:** k3s control plane needs about 1 GB of RAM. The whole platform fits into 11.5 GB, and Windows keeps about 4.5 GB.
- **Certified Kubernetes:** standard APIs, so the skills and manifests are the same as for any other cluster.
- **Batteries included:** ingress (Traefik), load balancer (ServiceLB), storage (local-path) and NetworkPolicy enforcement come with k3s.
- **Survives reboots:** k3s runs as a systemd service and the cluster comes back after the VMs start.
- **Reproducible:** Ansible and snapshots rebuild the platform without manual steps inside the VMs.

## Consequences

- **Positive:** a real multi-node cluster on one PC with no cloud cost.
- **Positive:** the platform can be fully stopped and started again.
- **Trade-off:** one physical host. If the PC fails, everything is down. Acceptable for a learning project.
- **Trade-off:** one control plane node. If `k8s-cp` is down, running pods continue, but nothing can be changed or rescheduled.
- **Trade-off:** local-path storage keeps MongoDB data on the `k8s-w1` disk. The pod cannot move to another node, and the data is lost if the disk is lost.
- **Trade-off:** VM creation is manual. Only the configuration inside the VMs is automated.
