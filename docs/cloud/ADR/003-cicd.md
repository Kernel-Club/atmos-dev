# ADR-003: CI/CD - GitHub Actions + Docker Hub + Kubernetes

## Context

Project Atmos requires a CI/CD process that provides a controlled path from application changes to deployed workloads.

The process must:

- validate changes with linting and tests;
- build and publish versioned Docker images;
- hand the published image over to the deployment pipeline;
- keep application, Kubernetes, and infrastructure responsibilities separated.

Project Atmos uses three repositories:

| Repository | Responsibility |
|---|---|
| `project-atmos-dev` | Application, Docker, Compose, CI, image delivery |
| `project-atmos-k8s` | Kubernetes configuration and deployment (CDeployment) |
| `project-atmos-iac` | AWS infrastructure with Terraform |

## Decision

We choose **GitHub Actions** as the automation platform and **Docker Hub** as the container registry.

The pipeline in `project-atmos-dev` is one workflow, `ci-delivery.yml`, with four jobs. The image is built once in the `build` job and passed to the `delivery` job, so the image that is built is the image that is published.

Runs on pushes and Pull Requests targeting `main` and `develop`:

1. **Lint** (Ruff for the backend, oxlint for the frontend).
2. **Tests** (pytest).
3. **Build**, after lint and tests pass: build the Docker images.
4. **Delivery**, after the build:
   1. Tag the images: `<service>:<version>-<sha6>`.
   2. Push them to Docker Hub.
   3. Trigger the deployment pipeline in `project-atmos-k8s` with a `repository_dispatch` event (`deploy`) that carries the image tag. The workflow ends here.

The `delivery` job runs only on a push to `develop`. On Pull Requests and on pushes to `main` the images are built but not published, and nothing is triggered.

```text
Code
 ↓
Lint → Tests
 ↓
Build image
 ↓
Tag → Push to Docker Hub   (develop only)
 ↓
Trigger project-atmos-k8s pipeline
```

### Image tags

```text
<DOCKERHUB_NAMESPACE>/<PROJECT_NAME>-backend:v1.0.0-<sha6>
<DOCKERHUB_NAMESPACE>/<PROJECT_NAME>-frontend:v1.0.0-<sha6>
```

The tag is applied in the `delivery` job. It contains the application version and the first 6 characters of the Git commit SHA. The version is set in `APP_VERSION` in `ci-delivery.yml`. Images are built and published only from `develop`.

### Deployment (out of scope of this repository)

`project-atmos-dev` does not deploy anything and has no cloud credentials. The pipeline in `project-atmos-k8s` is triggered by the delivery workflow. It is responsible for checking the image on Docker Hub and deploying to the DEV namespace in Kubernetes. PROD deployment, approvals, and authentication to AWS belong to that pipeline and are not defined yet.

## Why

- **Project fit:** GitHub Actions integrates directly with the project's GitHub workflow.
- **Simplicity:** One workflow, one run, one path: check, build, publish, notify. Deployment stays a separate concern.
- **Same artifact:** The image is built once, after checks pass, and the same build is published. No second build.
- **Reproducibility:** Version and commit in the tag identify exactly what is deployed.
- **Repository separation:** The application repository has no knowledge of clusters, namespaces, or AWS. It only publishes an image and sends a signal.
- **No stored cloud keys:** Without a deploy step, this repository needs no AWS credentials.

## Consequences

- **Positive:** Application changes are automatically validated and packaged.
- **Positive:** Images are versioned and stored in a dedicated registry.
- **Positive:** Application, Kubernetes, and infrastructure workflows are independently managed.
- **Trade-off:** There is no environment promotion in this repository. The same image tag is deployed everywhere, and the separation of DEV and PROD is the responsibility of the k8s pipeline.
- **Trade-off:** The delivery process depends on GitHub Actions and Docker Hub.
- **Trade-off:** Multiple repositories require coordination: the `repository_dispatch` payload (`image_tag`) is a contract between `project-atmos-dev` and `project-atmos-k8s`.
- **Trade-off:** Docker Hub does not enforce tag immutability here. Tags are treated as immutable by convention.
- **Trade-off:** `K8S_REPO_TOKEN` is a long-lived secret with write access to `project-atmos-k8s`.
