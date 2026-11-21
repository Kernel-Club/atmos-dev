// CI pipeline of Atmos for the on-premise platform (Jenkins on the jenkins server).
// Checks, tests and packages every change of develop into versioned images in Nexus.
// The job that runs it is defined in atmos-jenkins.

pipeline {
  agent any

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
          sh '''
            python -m venv .venv
            . .venv/bin/activate
            pip install --quiet --no-cache-dir -r requirements.txt
            ruff check .
            pytest
          '''
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
  }
}
