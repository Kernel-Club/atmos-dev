# Project Atmos On-Premise — Risks

Application risks (OpenWeather, MongoDB, Redis unavailable) are the same as in the cloud version: see [cloud risks](../cloud/risks.md). This file lists the risks of the on-premise platform.

| Risk | Impact | Mitigation |
|---|---|---|
| Host PC failure or reinstall | The whole platform is unavailable | All configuration is in Git; VMs are rebuilt from `clean-os` snapshots and Ansible |
| Not enough RAM on the host | VMs swap, pods are killed (OOM), Windows becomes slow | Memory limits on every pod, no log storage (only `kubectl logs`), Prometheus retention about 3 days, stop the VMs when the PC is used for other things |
| `k8s-cp` VM down (single control plane) | Running pods continue, but deploys and rescheduling stop | Start order `tools`, `k8s-cp`, `k8s-w1`; snapshot of `k8s-cp` |
| `k8s-w1` disk lost (MongoDB on local-path) | Weather history is lost | Manual `mongodump` before risky changes; data is not critical |
| IP conflict in the home network | VMs are unreachable, `*.atmos.lan` names stop working | Static IPs outside the router DHCP range |
| Nexus disk full | New images cannot be pushed, builds fail | Nexus cleanup policy for old `build-*` tags; disk usage visible in Grafana (node-exporter) |
| Plain HTTP registry (port 5000) | Images could be read or replaced inside the home network | Home network only; `ufw` on `tools` opens 5000 only to the cluster nodes; no port forwarding on the router |
| Jenkins credentials leaked | Attacker can push images to Nexus | Jenkins has only a Nexus user, no cluster access; Jenkins reachable only through Traefik from the home network |
| Flux deploy key leaked | Attacker can change `project-atmos-onprem-gitops` | Key has write access to that one repository only; revoke and rotate in GitHub |
| GitHub token for Flux bootstrap leaked | Access to GitHub repositories | Used once for bootstrap, then revoked |
| No central log storage | Logs of restarted or deleted pods are lost | `kubectl logs --previous` for the last restart; Loki can be added later if RAM allows |
| Self-signed certificate | Browser warnings for Jenkins and Nexus | Trust the certificate on the admin machine |
| Version drift after reinstall | Platform behaves differently after a rebuild | Versions pinned in Ansible `group_vars`; Helm chart versions pinned in the gitops repository |
