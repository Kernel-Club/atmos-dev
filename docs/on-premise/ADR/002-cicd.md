# ADR-002: CI/CD - Jenkins + Nexus + Flux (GitOps)

## Context

Project Atmos requires an on-premise CI/CD process that:

- validates changes with linting and tests;
- builds and stores versioned Docker images inside the home network;
- deploys the new images to the cluster without manual steps;
- does not give the CI system access to the cluster;
- keeps the application repository free of on-premise configuration, because it is shared with the cloud version.

## Decision

- **CI:** Jenkins on the `tools` VM.
- **Registry:** Nexus Repository (Docker repository, port 5000) on the `tools` VM.
- **CD:** Flux with image automation in the cluster (GitOps, pull model).

The `Jenkinsfile` lives in `project-atmos-onprem-jenkins`. The Jenkins job reads it from that repository; the `Jenkinsfile` checks out `project-atmos-dev` (branch `develop`) with polling enabled.

```text
Commit to develop
 ↓
Jenkins: lint → tests → build images
 ↓
Push to Nexus: build-<number>-<sha6>
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
<nexus>:5000/project-atmos-backend:build-<number>-<sha6>
<nexus>:5000/project-atmos-frontend:build-<number>-<sha6>
```

The build number gives Flux an increasing order to select the newest tag. The SHA identifies the commit.

## Alternatives

- **GitHub Actions with a self-hosted runner:** reuses the cloud workflow, but the runner needs inbound access to GitHub jobs and the project goal is to learn Jenkins.
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
- **Trade-off:** Jenkins starts builds by polling, so a build starts up to one polling interval after the commit.
- **Trade-off:** the Nexus registry uses plain HTTP inside the home network. Docker, k3s and Flux must be configured to allow it.
- **Trade-off:** Flux has a deploy key with write access to the gitops repository. It is limited to that one repository.
- **Trade-off:** two repositories must stay in sync: the `Jenkinsfile` depends on the paths and Dockerfiles in `project-atmos-dev`.
