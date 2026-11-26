# ADR-002: CI/CD - Jenkins + Nexus + Flux (GitOps)

## Context

Atmos requires an on-premise CI/CD process that:

- validates changes with linting and tests;
- builds and stores versioned Docker images inside the home network;
- deploys the new images to the cluster without manual steps;
- records every deployed version in Git and allows a rollback;
- does not give the CI system access to the cluster;
- keeps the application repository free of on-premise configuration, because it is shared with the cloud version.

## Decision

- **CI:** Jenkins on the `jenkins` VM.
- **Registry:** Nexus Repository (Docker hosted repository) on the `nexus-traefik` VM, reached as `nexus.atmos.lan:5000` over HTTPS through Traefik.
- **CD:** Flux with image automation in the cluster (GitOps, pull model).

The Jenkins platform (image, plugins, configuration as code) lives in `atmos-jenkins`. The `Jenkinsfile` lives in `atmos-dev`, next to the code it builds; Jenkins checks out `develop` over HTTPS without a credential, because the repository is public. Builds start by SCM polling, because GitHub webhooks cannot reach the home network.

Each part lives in its own repository:

| Part | Repository |
|---|---|
| Install Docker, Nexus, Traefik (`nexus-traefik`) and Docker, Jenkins (`jenkins`), run as Docker containers by Ansible; admin passwords in Ansible Vault | `atmos-ansible` (`roles/docker/`, `roles/nexus/`, `roles/traefik/`, `roles/jenkins/`) |
| Jenkins platform: image, plugins, configuration as code | `atmos-jenkins` (`Dockerfile`, `plugins.txt`, `casc/`) |
| CI pipeline: lint, tests, image build, tagging, push to Nexus | `atmos-dev` (`Jenkinsfile`) |
| CD: Flux, image automation, Helm chart | `atmos-k8s` (`clusters/atmos/`, `charts/atmos/`) |

Flow: commit to `develop` → Jenkins (lint, tests, build) → push to Nexus → Flux sees the new tag → Flux commits it to `atmos-k8s` → Flux upgrades the Helm release. Jenkins does CI, Flux does CD. Jenkins has no kubeconfig and no access to `atmos-k8s`.

### Image tags

```text
nexus.atmos.lan:5000/atmos-backend:<MAJOR.MINOR>.<commit count>-<short commit>
nexus.atmos.lan:5000/atmos-frontend:<MAJOR.MINOR>.<commit count>-<short commit>
```

Example: `1.0.87-04d80be`. MAJOR.MINOR is set in the `VERSION` file of `atmos-dev`; the commit count is counted by Git, so it keeps growing also after a rebuild of Jenkins. Flux selects the newest image by `MAJOR.MINOR.PATCH` (semver image policy); the short commit identifies the code. A published tag is never overwritten.

Flux writes the new tag into `spec.values` of the HelmRelease. The tag is not kept in `charts/atmos/values.yaml`: the deployed version of every image is in one file next to the other Flux objects, and the chart keeps only defaults.

### Access

| Who | Access |
|---|---|
| Jenkins | read `atmos-dev`; push to Nexus |
| Cluster nodes and Flux | pull from Nexus |
| Flux | read and write `atmos-k8s` only (GitHub App of the organization) |

### Rollback

Suspend the image update automation, revert the tag commit in `atmos-k8s`, and resume the automation after the fix. Without the suspend, Flux would select the newest image again.

## Alternatives

- **GitHub Actions with a self-hosted runner:** reuses the cloud workflow, but the build would depend on GitHub Actions, and one goal of the on-premise version is to run CI on our own server with Jenkins.
- **Docker Hub as registry:** images leave the home network, and pulls depend on the internet and rate limits.
- **Harbor:** a stronger registry (scanning, signing), but needs more RAM than Nexus on the `nexus-traefik` VM.
- **Argo CD:** comparable GitOps tool with a web UI, but uses more RAM. Flux is lighter and has built-in image automation.
- **Jenkins deploys with `kubectl` / `helm` (push model):** simpler, but Jenkins would need cluster credentials, and the cluster state would not be described in Git.
- **`Jenkinsfile` in `atmos-jenkins` (previous design):** the pipeline was apart from the code it builds, so a change of paths or Dockerfiles needed two repositories.
- **Jenkins configured in the web interface or with Groovy init scripts:** manual setup cannot be rebuilt the same way; init scripts are imperative and use internal APIs. JCasC is declarative, applied at every start and fails on unknown settings.

## Why

- **Separation of duties:** a compromised Jenkins cannot change the cluster configuration or read the cluster Secrets. It can still push an image that Flux deploys; the image is rolled back with Git.
- **CI apart from the registry:** Jenkins and Nexus are on different VMs. The Docker socket gives Jenkins no control over Nexus or Traefik, and the cluster can pull images while `jenkins` is down.
- **Git is the source of truth:** the deployed version is a commit in `atmos-k8s`, so it can be reviewed and rolled back with Git.
- **Everything stays local:** images are built, stored and pulled inside the home network.
- **Shared application repository:** no on-premise files in `atmos-dev`.

## Consequences

- **Positive:** automatic delivery from a commit to the running pods.
- **Positive:** the cluster pulls its state; no inbound access from CI to the cluster.
- **Trade-off:** a build starts up to one polling interval after the commit.
- **Trade-off:** the registry uses a self-signed certificate. The CA must be trusted by Docker on `jenkins`, by k3s on the nodes and by Flux.
- **Trade-off:** Flux writes to `atmos-k8s` through a GitHub App (deploy keys are turned off by the policy of the organization). The App is installed only on that repository with contents read and write; Flux gets a token for one hour at a time from its private key, so no long-lived token is stored.
- **Trade-off:** a rollback needs two steps (suspend automation, revert).
- **Trade-off:** Jenkins builds with the Docker socket of `jenkins`, which gives it root rights on that VM. Jenkins is reachable only through Traefik: `ufw` accepts port 8080 only from `nexus-traefik`.
- **Trade-off:** the version comes from the commit count of `develop`. Rewriting the history of `develop` (force push) would lower it, so `develop` is changed only through Pull Requests.
- **Trade-off:** the `Jenkinsfile` uses credential IDs (`nexus-push`) defined in `atmos-jenkins`; renaming one needs a change in both repositories.
