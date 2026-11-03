# Project Atmos

Weather web application built with **React, FastAPI, MongoDB, and Redis**.

The application allows users to search for a city and view current weather information and weather search history.

The same code and Dockerfiles run on every platform:

| Platform | How it runs | Documentation |
|---|---|---|
| Local | Docker Compose (this README) | — |
| Cloud | AWS EKS, GitHub Actions, Docker Hub | [docs/cloud](docs/cloud/architecture.md) |
| On-premise | k3s on VirtualBox VMs, Jenkins, Nexus, Flux | [docs/on-premise](docs/on-premise/architecture.md) |

## Architecture

```text
User / Browser
      ↓
React + Vite
      ↓
FastAPI
   ↙     ↘
Redis   MongoDB
   ↓
OpenWeather API
```

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Python + FastAPI
- **Database:** MongoDB
- **Cache:** Redis
- **External API:** OpenWeather
- **Containerization:** Docker + Docker Compose

## Prerequisites

You only need:

- Docker Desktop
- An OpenWeather API key

No local Python, Node.js, MongoDB, or Redis installation is required.

## How to Run

### 1. Clone the repository

```bash
git clone <repository-url>
cd project-atmos-dev
```

### 2. Get an OpenWeather API key

Go to:

[https://openweathermap.org/api](https://openweathermap.org/api)

On the website, press **"Get API key"** and create an account if needed.

Copy your API key.

### 3. Create the environment file

Create a `.env` file in the project root:

```text
OPENWEATHER_API_KEY=your_api_key_here
```

You can use `.env.example` as a reference.

**Do not commit your `.env` file or share your API key.**

### 4. Start the application
> **Make sure Docker Desktop is installed and running, or that Docker Engine and Docker Compose CLI are available on your system.**

```bash
docker compose up --build
```

Docker Compose will start:

- Frontend
- Backend
- MongoDB
- Redis

### 5. Open the application

Open:

```text
http://localhost:5173
```

The backend API is available at:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/health
```

## Application

You can:

- Search for weather by city
- View current weather information
- View previous weather searches
- Use cached weather data through Redis

MongoDB stores weather search history.

## Logs

To view application logs:

```bash
docker compose logs
```

To follow logs:

```bash
docker compose logs -f
```

To view logs for a specific service:

```bash
docker compose logs -f backend
```

## Stop the Application

```bash
docker compose down
```

The MongoDB data is stored in a Docker volume and will remain available after `docker compose down`.

To remove containers **and** the stored MongoDB data:

```bash
docker compose down -v
```

> `docker compose down -v` permanently removes the local database volume.

## CI/CD

Each platform has its own pipeline. This repository contains only the application.

### Cloud: GitHub Actions

> **The workflow is started only by hand** (Actions → CI-Delivery → Run workflow). Push and pull request triggers are disabled because the cloud environment is not always running.

The workflow `.github/workflows/ci-delivery.yml` runs lint, tests and a build of both images.

On `develop` it also tags the images (`v1.0.0-<commit>`), pushes them to Docker Hub and starts the deploy pipeline in `project-atmos-k8s`.

Settings come from GitHub, nothing is written in the workflow:
- organization variables: `PROJECT_NAME`, `DOCKERHUB_NAMESPACE`
- repository secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `K8S_REPO_TOKEN`

Images: `<DOCKERHUB_NAMESPACE>/<PROJECT_NAME>-backend` and `-frontend`. The k8s repository is `<owner>/<PROJECT_NAME>-k8s`.

### On-premise: Jenkins

Jenkins polls `develop` of this repository. The `Jenkinsfile` lives in `project-atmos-onprem-jenkins`, not here. Images go to Nexus and Flux deploys them. See [docs/on-premise](docs/on-premise/architecture.md).
