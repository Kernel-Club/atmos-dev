// CI pipeline of Atmos for the on-premise platform (Jenkins on the jenkins server).
// Checks, tests and packages every change of develop into versioned images in Nexus.
// The job that runs it is defined in atmos-jenkins.

pipeline {
  agent any

  environment {
    REGISTRY = 'nexus.atmos.lan:5000'
  }

  options {
    skipDefaultCheckout()                           // checkout is an explicit stage below
    disableConcurrentBuilds()                       // one build of this job at a time
    buildDiscarder(logRotator(numToKeepStr: '20'))  // keep the logs of the last 20 builds
    timeout(time: 30, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log --oneline -1'
        script {
          // Image version: MAJOR.MINOR from the VERSION file, PATCH = number of commits,
          // then the short commit. Counted by Git, so it keeps growing after a rebuild of Jenkins.
          def majorMinor = readFile('VERSION').trim()
          def commits = sh(script: 'git rev-list --count HEAD', returnStdout: true).trim()
          def commit = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.IMAGE_TAG = "${majorMinor}.${commits}-${commit}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.IMAGE_TAG}"
        }
      }
    }

    // Lint and tests run in temporary containers: nothing is installed on the server.
    // A failed command stops the build.
    stage('Backend: lint and tests') {
      agent {
        docker {
          image 'python:3.12-slim'
          reuseNode true          // same workspace as the checkout
        }
      }
      steps {
        dir('backend') {
          sh 'python -m venv .venv'
          sh '.venv/bin/pip install --quiet --no-cache-dir -r requirements.txt'
          sh '.venv/bin/ruff check .'
          sh '.venv/bin/pytest'
        }
      }
    }

    stage('Frontend: lint') {
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        dir('frontend') {
          sh 'npm ci --no-audit --no-fund'
          sh 'npm run lint'
        }
      }
    }

    // Images are built by the Docker Engine of the server (through its socket).
    stage('Build images') {
      steps {
        sh 'docker build -f backend.Dockerfile -t "$REGISTRY/atmos-backend:$IMAGE_TAG" .'
        sh 'docker build -f frontend.Dockerfile -t "$REGISTRY/atmos-frontend:$IMAGE_TAG" .'
      }
    }
  }
}
