# Project Atmos On-Premise — Risks

Application risks (OpenWeather, MongoDB, Redis unavailable) are the same as in the cloud version: see [cloud risks](../cloud/risks.md). This file lists the risks of the on-premise platform. The risks are reviewed again after the implementation (US-07).

| Risk | Impact | Mitigation |
|---|---|---|
| Host PC failure or reinstall | The whole platform is unavailable | All configuration is in Git; the servers are recreated with `vms.yml` and `site.yml` |
| Host restarts without warning (Windows update, power loss) | Servers stop unsafely; the cluster or data can break | Windows active hours and update pause; stop the servers with `stop.yml` before updates; `clean` snapshots for a rebuild |
| Not enough RAM on the host | Servers swap, pods are killed (OOM), Windows becomes slow | Planned resource budget; memory limits on every pod and container; WSL2 limited in `.wslconfig`; no log storage; Prometheus retention 3 days; stop the servers when the PC is used for other things |
| `k8s-cp` down (single control plane) | Running pods continue, but deploys and rescheduling stop | Start order `tools`, `k8s-cp`, `k8s-w1`; rebuild from the `clean` snapshot and Ansible |
| Disk with MongoDB data lost (local-path) | Weather history is lost | Manual `mongodump` before risky changes; data is not critical |
| VM creation fails (unattended install, `VBoxManage` from WSL2) | Servers cannot be created or rebuilt | Pinned Ubuntu image with checksum; `vms.yml` skips existing servers and can be run again; `clean` snapshots |
| IP conflict in the home network | Servers are unreachable, `*.atmos.lan` names stop working | Fixed addresses outside the router DHCP range |
| Nexus disk full | New images cannot be pushed, builds fail | Nexus cleanup policy and compact blob store task; free disk visible in Grafana |
| Self-signed CA not trusted somewhere | Docker push, image pull or Flux scan fails; browser warnings | Ansible distributes the CA to Docker, the cluster nodes and the admin machine; Flux gets it as a Secret; the check is part of US-03 to US-05 |
| Certificate expires | Registry and tools stop working over HTTPS | Long validity for the CA; expiry date written in the provision `README.md`; certificate recreated by Ansible |
| Jenkins credentials leaked | Attacker can push images to Nexus | Jenkins has only a Nexus push user and a read-only deploy key; no cluster access; Jenkins reachable only through Traefik from the home network |
| Flux deploy key leaked | Attacker can change `project-atmos-onprem-gitops` | Key has write access to that one repository only; revoke and rotate in GitHub |
| GitHub token for the Flux bootstrap leaked | Access to GitHub repositories | Short-lived token, revoked after the bootstrap |
| Vault password or secrets committed by mistake | Platform credentials leak | `.gitignore` in every platform repository; vault password stays outside the repository; app secrets are created by hand |
| Rollback undone by image automation | Flux deploys the broken image again after `git revert` | Suspend the image update automation before the revert |
| No central log storage | Logs of restarted or deleted pods are lost | `kubectl logs --previous` for the last restart; metrics in Grafana |
| Version drift after a rebuild | Platform behaves differently after a rebuild | Versions pinned in Ansible `group_vars/`; Helm chart versions pinned in the gitops repository |
