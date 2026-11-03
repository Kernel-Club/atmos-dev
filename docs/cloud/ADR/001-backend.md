# ADR-001: Backend - Python + FastAPI

## Context

Project Atmos requires a backend service that:

- provides the HTTP API for the frontend;
- retrieves weather data from the OpenWeather API;
- uses Redis for weather data caching;
- stores and retrieves weather history in MongoDB;
- runs as a containerized application in local Docker Compose and Amazon EKS environments.

The backend should remain lightweight and simple, as the primary purpose of the project is to demonstrate application containerization, CI/CD, Kubernetes, and AWS infrastructure without unnecessary application complexity.

## Decision

We choose **Python + FastAPI** for the backend service.

The backend will be implemented as a standalone HTTP API responsible for communication with the frontend and integration with the external weather API, Redis, and MongoDB.

The backend is part of the application repository and is containerized with Docker. Kubernetes deployment configuration is maintained separately in the Kubernetes repository.

## Why

- **Project fit:** FastAPI provides the HTTP API capabilities required by the application.
- **Simplicity:** Python and FastAPI allow the backend to remain small and straightforward to develop and operate.
- **Integration:** FastAPI can directly support the required integrations with OpenWeather, Redis, and MongoDB.
- **Operational fit:** The backend is well suited to containerized execution in Docker Compose and Amazon EKS.
- **Maintainability:** FastAPI provides a clear structure for a small service without introducing a larger application framework.

## Consequences

- **Positive:** The backend remains lightweight and focused on application functionality.
- **Positive:** The service integrates cleanly with the frontend, Redis, MongoDB, and OpenWeather.
- **Positive:** The application can be packaged as a Docker container for local and Kubernetes environments.
- **Positive:** The technology choice keeps application complexity low and supports the project's DevOps focus.
- **Trade-off:** Python generally provides lower raw runtime performance than compiled languages such as Go.
- **Trade-off:** The backend depends on Python and the FastAPI ecosystem.