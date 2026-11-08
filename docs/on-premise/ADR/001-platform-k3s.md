# ADR-001: Platform - k3s on VirtualBox VMs created by Vagrant

## Context

Project Atmos needs an on-premise Kubernetes platform that:

- runs on one personal PC (Windows 11 Pro, 4 cores / 8 threads, 16 GB RAM) without cloud services;
- is a real multi-node cluster, not a single developer sandbox;
- leaves enough RAM for Windows and for the CI tools (Jenkins, Nexus);
- can be stopped completely when the PC is used for other things, and starts again without manual repair;
- can be rebuilt from Git without manual steps.

## Decision

We choose **k3s** on **three VirtualBox VMs** (Ubuntu Server 24.04 LTS). **Vagrant** creates the VMs from one declarative `Vagrantfile`. **Ansible** configures them over SSH. Both run in WSL2 on the host; Vagrant controls VirtualBox on Windows.

| VM | Role |
|---|---|
| `tools` | Jenkins, Docker, Nexus, Traefik (outside the cluster) |
| `k8s-cp` | k3s server (control plane) |
| `k8s-w1` | k3s agent (worker) |

- `Vagrantfile` describes the VMs (box, CPU, RAM, disk, network, admin SSH key). `vagrant up` creates the VMs that do not exist and starts them; it changes only what differs from the file. The box version is pinned.
- `site.yml` configures all servers, installs the CI tools and k3s. Versions are pinned in `group_vars/`.
- `vagrant halt` stops the servers safely.
- A `clean` snapshot of each VM (`vagrant snapshot save`) after the base configuration allows a fast rebuild.

CI tools run on a separate VM, outside the cluster, so a broken cluster does not stop builds and Jenkins does not compete with the application for node RAM.

## Alternatives

- **minikube / kind:** one-node tools for a developer machine. They do not give a multi-node cluster across VMs and are not meant to run as a platform.
- **kubeadm:** full upstream Kubernetes, but the control plane alone needs more RAM, and setup and upgrades take much more work.
- **MicroK8s:** comparable, but tied to snap packages; k3s is a single binary and simpler to install with Ansible.
- **One big VM:** less overhead, but no real node separation and no practice with a multi-node cluster.
- **Ansible with `VBoxManage` for the VMs:** one tool less, but imperative: every step (create the VM, attach the disk, unattended OS install, check if the VM already exists) must be written and tested by hand. Vagrant gives the same result from one declarative file, and the `Vagrantfile` stays in the same repository as the Ansible code.
- **VMs created by hand:** simple, but a rebuild needs manual steps and the result can differ.

## Why

- **Low resources:** the k3s control plane needs about 1 GB of RAM. All servers fit into 11.5 GB, and Windows keeps about 4.5 GB.
- **Certified Kubernetes:** standard APIs, so the skills and manifests are the same as for any other cluster.
- **Batteries included:** ingress (Traefik), load balancer (ServiceLB), storage (local-path) and NetworkPolicy enforcement come with k3s.
- **Survives reboots:** k3s runs as a systemd service and the cluster comes back after the VMs start.
- **Rebuild from Git:** the whole platform, from the empty VM to the running cluster, is described in `project-atmos-onprem-ansible`. The workloads that run inside the cluster are described separately in `project-atmos-onprem-k3s` and installed by Flux. The secrets (Jenkins credentials, Flux bootstrap, Kubernetes Secrets) and the Jenkins job are created by hand after a rebuild.

## Consequences

- **Positive:** a real multi-node cluster on one PC with no cloud cost.
- **Positive:** the platform can be fully stopped, started again and rebuilt with a few commands.
- **Trade-off:** one physical host. If the PC fails, everything is down. Acceptable for a learning project.
- **Trade-off:** one control plane node. If `k8s-cp` is down, running pods continue, but nothing can be changed or rescheduled.
- **Trade-off:** local-path storage keeps MongoDB data on the disk of one node. The pod cannot move to another node, and the data is lost if the disk is lost.
- **Trade-off:** WSL2 needs Hyper-V, so VirtualBox runs on top of Hyper-V. The servers are slower than with VirtualBox alone. This is checked with the first server in US-02.
- **Trade-off:** Vagrant runs in WSL2 and controls VirtualBox on Windows. This needs extra settings: `VAGRANT_WSL_ENABLE_WINDOWS_ACCESS=1`, the project folder on the Windows disk (`/mnt/c/...`), the default synced folder turned off, and the admin SSH key kept in the WSL2 home folder (key files on `/mnt/c` get wrong permissions). Ansible also changes the Windows hosts file, which needs administrator rights.
