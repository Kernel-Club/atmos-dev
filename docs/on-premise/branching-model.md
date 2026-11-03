# Branching Model — Project Atmos On-Premise

## 1. Overview

The application repository `project-atmos-dev` is shared by the cloud and the on-premise versions. It uses one branching model for both platforms.

The `main` branch contains stable code. The `develop` branch integrates changes before they are promoted to `main`.

## 2. Branch Structure

### Application repository (`project-atmos-dev`)

| Branch | Purpose | Source | Target |
|---|---|---|---|
| `main` | Stable code | `develop` | — |
| `develop` | Integration and testing | `main` (initial setup) | `main` |
| `feature/*` | New features and functionality | `develop` | `develop` |
| `fix/*` | Bug fixes | `develop` | `develop` |
| `release/*` | Optional release stabilization | `develop` | `main` |

### On-premise platform repositories

`project-atmos-onprem-jenkins`, `project-atmos-onprem-provision` and `project-atmos-onprem-gitops` use a shorter model:

| Branch | Purpose | Source | Target |
|---|---|---|---|
| `main` | Current platform configuration | — | — |
| `feature/*` | New configuration or changes | `main` | `main` |
| `fix/*` | Configuration fixes | `main` | `main` |

There is no `develop` branch: there is one on-premise environment, and the state of `main` is the state of the platform.

Flux commits image tag updates directly to `main` of `project-atmos-onprem-gitops`. These commits do not go through Pull Requests.

## 3. Development Workflow

### Feature Development

1. Create a feature branch from `develop` (application) or `main` (platform repositories).
2. Implement the change and commit using Conventional Commits.
3. Open a Pull Request to the source branch.
4. Merge the Pull Request. In the application repository, Jenkins then runs lint and tests on `develop`.

Example:

`feature/weather-cache`

### Bug Fixes

1. Create a fix branch from `develop` (application) or `main` (platform repositories).
2. Implement and test the fix.
3. Open a Pull Request to the source branch.
4. Merge the Pull Request.

Example:

`fix/weather-api-timeout`

## 4. Branch Synchronization

When fixes are merged into `main` of the application repository, synchronize `main` back into `develop` through a Pull Request.

## 5. Branch Protection

GitHub Rulesets are not enforced for private repositories under the current organization plan. The branching policy is followed by the team's development process, not guaranteed by GitHub.
