# ADR-002: CI/CD - Jenkins + Nexus + Flux (GitOps)

## Context

Project Atmos requires an on-premise CI/CD process that:

- validates changes with linting and tests;
- builds and stores versioned Docker images inside the home network;
- deploys the new images to the cluster without manual steps;
- records every deployed version in Git and allows a rollback;
- does not give the CI system access to the cluster;
- keeps the application repository free of on-premise configuration, because it is shared with the cloud version.

## Decision

- **CI:** Jenkins on the `tools` VM.
- **Registry:** Nexus Repository (Docker hosted repository) on the `tools` VM, reached as `nexus.atmos.lan:5000` over HTTPS through Traefik.
- **CD:** Flux with image automation in the cluster (GitOps, pull model).

The `Jenkinsfile` lives in `project-atmos-onprem-jenkins`. The Jenkins job reads it from that repository; the `Jenkinsfile` checks out `project-atmos-dev` (branch `develop`) with a read-only deploy key. Builds start by SCM polling, because GitHub webhooks cannot reach the home network.

```text
Commit to develop
 ↓
Jenkins: lint → tests → build images
 ↓
Push to Nexus: <build>-<short-sha>
 ↓
Flux sees the new tag in Nexus
 ↓
Flux commits the tag to project-atmos-onprem-gitops
 ↓
Flux upgrades the Helm release in the cluster
```

Jenkins does CI. Flux does CD. Jenkins has no kubeconfig and no access to the gitops repository.

### Image tags

```text
nexus.atmos.lan:5000/project-atmos-backend:<build>-<short-sha>
nexus.atmos.lan:5000/project-atmos-frontend:<build>-<short-sha>
```

Example: `42-a1b2c3d`. The build number gives Flux a numeric order to select the newest image. The SHA identifies the commit.

### Access

| Who | Access |
|---|---|
| Jenkins | read `project-atmos-dev`; push to Nexus |
| Cluster nodes and Flux | pull from Nexus |
| Flux | read and write `project-atmos-onprem-gitops` only (deploy key) |

### Rollback

Suspend the image update automation, revert the tag commit in the gitops repository, and resume the automation after the fix. Without the suspend, Flux would select the newest image again.

## Alternatives

- **GitHub Actions with a self-hosted runner:** reuses the cloud workflow, but the build would depend on GitHub Actions, and one goal of the on-premise version is to run CI on our own server with Jenkins.
- **Docker Hub as registry:** images leave the home network, and pulls depend on the internet and rate limits.
- **Harbor:** a stronger registry (scanning, signing), but needs more RAM than Nexus on the `tools` VM.
- **Argo CD:** comparable GitOps tool with a web UI, but uses more RAM. Flux is lighter and has built-in image automation.
- **Jenkins deploys with `kubectl` / `helm` (push model):** simpler, but Jenkins would need cluster credentials, and the cluster state would not be described in Git.
- **`Jenkinsfile` in `project-atmos-dev`:** fewer repositories, but on-premise configuration would mix with the shared application code.

## Why

- **Separation of duties:** a compromised Jenkins can push images but cannot change the cluster.
- **Git is the source of truth:** the deployed version is a commit in the gitops repository, so it can be reviewed and rolled back with Git.
- **Everything stays local:** images are built, stored and pulled inside the home network.
- **Shared application repository:** no on-premise files in `project-atmos-dev`.

## Consequences

- **Positive:** automatic delivery from a commit to the running pods.
- **Positive:** the cluster pulls its state; no inbound access from CI to the cluster.
- **Trade-off:** a build starts up to one polling interval after the commit.
- **Trade-off:** the registry uses a self-signed certificate. The CA must be trusted by Docker on `tools`, by k3s on the nodes and by Flux.
- **Trade-off:** Flux has a deploy key with write access to the gitops repository. It is limited to that one repository.
- **Trade-off:** a rollback needs two steps (suspend automation, revert).
- **Trade-off:** two repositories must stay in sync: the `Jenkinsfile` depends on the paths and Dockerfiles in `project-atmos-dev`.
