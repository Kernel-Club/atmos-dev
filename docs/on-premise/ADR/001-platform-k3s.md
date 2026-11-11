# ADR-001: Platform - k3s on VirtualBox VMs created by Vagrant

## Context

Atmos needs an on-premise Kubernetes platform that:

- runs on one personal PC (Windows 11 Pro, 4 cores / 8 threads, 16 GB RAM) without cloud services;
- is managed from a separate admin machine (Mac), where the code and all tools are;
- is a real multi-node cluster, not a single developer sandbox;
- keeps CI and the image registry outside the cluster;
- leaves enough RAM for Windows;
- can be stopped completely when the PC is used for other things, and starts again without manual repair;
- can be rebuilt from Git.

## Decision

We choose **k3s** on **four VirtualBox VMs** (Ubuntu Server 24.04 LTS). **Vagrant** runs on the host PC and creates the VMs from one declarative `Vagrantfile`; the Mac starts it over SSH. **Ansible** runs on the Mac and configures the VMs over SSH.

| VM | Role |
|---|---|
| `nexus-traefik` | Nexus (image registry), Traefik (HTTPS entry point); outside the cluster |
| `jenkins` | Jenkins, Docker (image build); outside the cluster |
| `k8s-cp` | k3s server (control plane) |
| `k8s-w1` | k3s agent (worker) |

- `Vagrantfile` describes the VMs (box, CPU, RAM, disk, network, SSH key of the Mac). `vagrant up` creates the VMs that do not exist and starts them; it changes only what differs from the file. The box version is pinned.
- `site.yml` configures all servers, installs Nexus, Traefik, Jenkins and k3s. Versions are pinned in `group_vars/`.
- `vagrant halt` stops the servers safely.
- A `clean` snapshot of each VM (`vagrant snapshot save`) after the base configuration allows a fast rebuild.

CI and the registry run on two VMs outside the cluster. The cluster depends only on the registry: a stopped or broken `jenkins` does not stop the application, and a build cannot take RAM from Nexus or from the pods.

## Alternatives

- **minikube / kind:** one-node tools for a developer machine. They do not give a multi-node cluster across VMs and are not meant to run as a platform.
- **kubeadm:** full upstream Kubernetes, but the control plane alone needs more RAM, and setup and upgrades take much more work.
- **MicroK8s:** comparable, but tied to snap packages; k3s is a single binary and simpler to install with Ansible.
- **One big VM:** less overhead, but no real node separation and no practice with a multi-node cluster.
- **One `tools` VM for Jenkins, Nexus and Traefik (previous design):** one VM less, but a build peak could stop Nexus (OOM), and a rebuild of Jenkins also removed the registry the cluster depends on.
- **Jenkins and Nexus on one VM, Traefik alone:** the registry would depend on CI, and a whole VM would run a 0.1 GB process.
- **Vagrant and Ansible in WSL2 on the host (previous design):** no second machine, but WSL2 needs Hyper-V, so VirtualBox runs slower on top of it; Vagrant in WSL2 needs extra settings, and WSL2 takes 1 GB of RAM. The code is on the Mac anyway.
- **Ansible with `VBoxManage` for the VMs:** one tool less, but imperative: every step (create the VM, attach the disk, unattended OS install, check if the VM already exists) must be written and tested by hand. Vagrant gives the same result from one declarative file, and the `Vagrantfile` stays in the same repository as the Ansible code.
- **VMs created by hand:** simple, but a rebuild needs manual steps and the result can differ.

## Why

- **Low resources:** the k3s control plane needs about 1 GB of RAM. All four servers fit into 11.5 GB, and Windows keeps about 3.9 GB.
- **Certified Kubernetes:** standard APIs, so the skills and manifests are the same as for any other cluster.
- **Batteries included:** ingress (Traefik), load balancer (ServiceLB), storage (local-path) and NetworkPolicy enforcement come with k3s.
- **Survives reboots:** k3s runs as a systemd service and the cluster comes back after the VMs start.
- **Rebuild from Git:** the whole platform, from the empty VM to the running cluster, is described in `atmos-ansible`. The workloads that run inside the cluster are described separately in `atmos-k8s` and installed by Flux. The secrets (Jenkins credentials, Flux bootstrap, Kubernetes Secrets) and the Jenkins job are created by hand after a rebuild.

## Consequences

- **Positive:** a real multi-node cluster on one PC with no cloud cost.
- **Positive:** the platform can be fully stopped, started again and rebuilt with a few commands.
- **Positive:** without WSL2 and Hyper-V, VirtualBox runs natively.
- **Trade-off:** one physical host. If the PC fails, everything is down. Acceptable for a learning project.
- **Trade-off:** one control plane node. If `k8s-cp` is down, running pods continue, but nothing can be changed or rescheduled.
- **Trade-off:** local-path storage keeps MongoDB data on the disk of one node. The pod cannot move to another node, and the data is lost if the disk is lost.
- **Trade-off:** Vagrant must run where VirtualBox is. The host PC keeps a clone of `atmos-ansible` (only `git pull`) and an OpenSSH server. If the Mac cannot reach the PC, the servers keep running but cannot be started, stopped or rebuilt from the Mac.
- **Trade-off:** four VMs have more overhead than three (about 0.15 GB of RAM per VM in VirtualBox).
- **Trade-off:** Ansible changes `/etc/hosts` on the Mac, which needs administrator rights (`--ask-become-pass`).
