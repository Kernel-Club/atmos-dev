# ADR-002: Frontend - React + Vite

## Context

Project Atmos requires a frontend application that:

- provides the user interface for the weather application;
- communicates with the backend HTTP API;
- displays current weather data and weather history;
- runs locally with Docker Compose;
- runs as a containerized application in Amazon EKS.

The frontend should remain lightweight and avoid introducing unnecessary server-side or full-stack application complexity.

## Decision

We choose **React + Vite** for the frontend.

The frontend will be implemented as a client-side application and will communicate with the backend through its HTTP API.

The frontend is part of the application repository and is containerized with Docker. Kubernetes deployment and external application routing are managed separately by the Kubernetes repository and AWS infrastructure.

## Why

- **Project fit:** React + Vite provides the required capabilities for the Atmos frontend.
- **Simplicity:** A client-side application is sufficient for the project's requirements and avoids unnecessary server-side rendering or full-stack framework complexity.
- **Maintainability:** React provides a component-based architecture suitable for a small application.
- **Operational fit:** Vite produces a frontend build that can be packaged into the application's Docker image and deployed alongside the backend.
- **Repository separation:** Frontend application code remains in the application repository while Kubernetes and infrastructure configuration are managed separately.

## Consequences

- **Positive:** The frontend remains lightweight and focused on client-side application functionality.
- **Positive:** React provides a component-based structure for developing and maintaining the UI.
- **Positive:** The frontend can be packaged and deployed as a container in both local Docker Compose and Amazon EKS environments.
- **Positive:** The frontend remains independent from the Kubernetes and AWS infrastructure implementation.
- **Trade-off:** React + Vite does not provide server-side rendering or backend functionality.
- **Trade-off:** Additional frontend libraries may be introduced if application requirements expand significantly.