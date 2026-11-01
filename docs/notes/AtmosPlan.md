# Project 01 — Real-Time Weather Platform

---

## Goal

Build a **web application** where a user types a **city** and sees **current weather** (temperature + description from the OpenWeather API). Store history, run locally and on Kubernetes, and ship with CI/CD, monitoring, and logging.

You will practice the full loop:

**ticket → design → choose tools → implement → review → release**

---

## Product requirements (must)


| ID  | Requirement                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Web UI: type a city → show current weather (temperature + description)                                                                                     |
| P2  | Backend fetches data from the **OpenWeather API**                                                                                                          |
| P3  | Persist weather history in **MongoDB**; retrieve history for later queries                                                                                 |
| P4  | Use **Redis** (e.g. cache recent city lookups — document your design)                                                                                      |
| P5  | Local setup with **Docker** + **Docker Compose** (app + MongoDB + Redis)                                                                                   |
| P6  | Deploy to **Kubernetes** with **Kustomize** for **two environments:** `dev` **and** `prod`                                                                 |
| P7  | **Gateway API + AWS ALB** for external access; use the ALB address                                                                                                |
| P8  | **Kubernetes CronJob** rotates MongoDB credentials (username + password) on a schedule (lab: every minute is OK) without permanent downtime — document how |
| P9  | **CI/CD**: lint/test → build image → push registry → deploy path (at least to `dev`)                                                                       |
| P10 | **Monitoring + logging**: chosen and documented; you can show “request failed → I find it”                                                                 |
| P11 | README: a stranger can run Compose and understand how K8s deploy works                                                                                     |


---

## Fixed vs free choices

### Fixed by this brief

OpenWeather API · MongoDB · Redis · Docker · Docker Compose · Kubernetes · Kustomize · Gateway API · ALB · DB credential-rotation CronJob · two envs (`dev`, `prod`) · CI/CD · monitoring + logging · city-based web UI

### You choose


| Area                       | Constraint                                       |
| -------------------------- | ------------------------------------------------ |
| Backend language/framework | HTTP API + OpenWeather + Mongo + Redis           |
| Frontend                   | City input + weather display                     |
| Web server / reverse proxy | Must work with Ingress                           |
| Source control             | Prefer GitHub if you use GitHub Actions          |
| CI/CD tool                 | Must build/push image + have a deploy path       |
| Container registry         | e.g. GHCR, Docker Hub                            |
| Kubernetes runtime         | Cloud                                            |
| Monitoring + logging stack | Prometheus, Grafana etc                          |
| IaC (Terraform etc.)       | Optional, K8s manifests + Kustomize are required |




### What is an ADR?

**ADR** = **Architecture Decision Record**.

It is a **short document** that records one important technical choice and **why** you made it — so you (and your mentor, and your future self) can understand the decision later without guessing.


|         |                                             |
| ------- | ------------------------------------------- |
| **Not** | A long design book or a tutorial copy-paste |
| **Yes** | One decision per file, usually ½–1 page     |


**Typical ADR answers:**

1. **Context** — What problem are we solving?
2. **Options** — What alternatives did you consider? (at least 2)
3. **Decision** — What did you choose?
4. **Why** — Main reasons (fit, learning, simplicity, job market, time)
5. **Consequences** — What becomes easier / harder because of this?

**Example filenames**

- `docs/adr/001-backend.md`  
- `docs/adr/002-frontend.md`  
- `docs/adr/003-cicd.md`

**Tiny template (copy into each ADR):**

```markdown
# ADR-00X: <title>

## Status
Proposed | Accepted | Superseded

## Context
…

## Options considered
1. …
2. …

## Decision
We choose …

## Why
…

## Consequences
- Positive: …
- Negative / trade-offs: …
```

For this project you need **at least 3 ADRs** (see Phase 1).

---

## How you will work (phases)

### Phase 0 — Kickoff (with mentor/PM)

- [ ] Confirm Definition of Done, timeline, demo date  
- [ ] Confirm OpenWeather key handling, cluster target, registry  
- [ ] Create repo + simple board: Backlog → In Progress → Review → Done  

### Phase 1 — Plan & architecture

- [ ] `docs/architecture.md` — diagram (ASCII/C4 OK): User → Ingress → Frontend/API → Redis → MongoDB → OpenWeather  
- [ ] `docs/adr/` — at least **3 ADRs** (e.g. backend, frontend, CI/CD or monitoring)  
- [ ] `docs/environments.md` — concrete diffs between **dev** and **prod** (replicas, resources, Ingress host, log level, image tag policy)  
- [ ] Short risk list: API key leak, rotation race, Ingress/DNS, image pull  

**Gate:** mentor approves design before heavy feature coding.

### Phase 2 — Local vertical slice

- [ ] City search → OpenWeather → UI shows temp + description  
- [ ] MongoDB stores history; you can retrieve it  
- [ ] Redis used for cache (document TTL/key design)  
- [ ] `docker compose up` works from README  
- [ ] `.env.example` only — **no real secrets in git**  

**Gate:** mentor can clone, follow README, hit the UI.

### Phase 3 — Kubernetes + Kustomize

- [ ] `kustomize` layout: `base/` + `overlays/dev` + `overlays/prod`  
- [ ] ALB address of the cluster documented  
- [ ] ConfigMaps/Secrets for config and credentials (lab-safe; README warns not prod-grade)  
- [ ] CronJob rotates MongoDB username/password; app stays usable or recovers — **document the mechanism**  
- [ ] Commands documented: `kubectl apply -k overlays/dev` (and prod)  

**Gate:** show Ingress URL + explain Kustomize diff `dev` vs `prod`.

### Phase 4 — CI/CD + observability

- [ ] Pipeline: PR checks + build/push image; deploy to `dev` (prod may use manual approval)  
- [ ] Monitoring: one dashboard or alert you can demo  
- [ ] Logging: where you look when a city lookup fails  
- [ ] README links to pipeline / badge  

**Gate:** PR → green CI; show a failure in logs or metrics.

### Phase 5 — Release & demo

- [ ] Release tag + short changelog  
- [ ] Demo script (5–8 min): UI → history → K8s → rotation → CI → observability  
- [ ] Retro: what broke, what you would harden for real prod  
- [ ] Portfolio polish: architecture, honest limitations  

---

## Suggested backlog


| ID    | Story                                    |
| ----- | ---------------------------------------- |
| PS-1  | Architecture + ADRs + environment matrix |
| PS-2  | Backend weather + history API            |
| PS-3  | Frontend city search UI                  |
| PS-4  | Compose stack (app, MongoDB, Redis)      |
| PS-5  | K8s base + Kustomize `dev` / `prod`      |
| PS-6  | Gateway + ALB address                        |
| PS-7  | MongoDB credential-rotation CronJob      |
| PS-8  | CI/CD pipeline                           |
| PS-9  | Monitoring + logging                     |
| PS-10 | Release, demo, retrospective             |


---

## Definition of Done (project)

A mentor can:

1. Run the stack with Docker Compose from the README
2. Understand the architecture from your docs
3. See (or reproduce) **dev** on Kubernetes with Ingress
4. See CI green and an image in the registry
5. Hear you explain credential rotation and env differences

Extra features without PM approval do **not** count as done.