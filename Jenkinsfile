// CI pipeline of Atmos for the on-premise platform (Jenkins on the jenkins server).
// Checks, tests and packages every change of develop into versioned images in Nexus.
// The job that runs it is defined in atmos-jenkins.

pipeline {
  agent any

  environment {
    REGISTRY = 'nexus.atmos.lan:5000'
    // Branch from the job parameter (atmos-jenkins); a build without the parameter is develop.
    BUILD_BRANCH = "${params.BRANCH ?: 'develop'}"
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
          // First line of the form MAJOR.MINOR; comment lines are skipped. No such line: the build fails.
          def majorMinor = sh(script: "grep -m1 -E '^[0-9]+\\.[0-9]+\$' VERSION", returnStdout: true).trim()
          def commits = sh(script: 'git rev-list --count HEAD', returnStdout: true).trim()
          def commit = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.IMAGE_TAG = "${majorMinor}.${commits}-${commit}"
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.IMAGE_TAG}"
          if (env.BUILD_BRANCH != 'develop') {
            // A test branch: all checks run, but no image is published (see the stage below).
            currentBuild.displayName += " (${env.BUILD_BRANCH}, not published)"
          }
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

    // Delivery: the images are published to Nexus, ready for deployment (by Flux).
    // Only develop publishes: Flux deploys every new tag, so a test branch must never reach Nexus.
    stage('Publish images') {
      when {
        expression { env.BUILD_BRANCH == 'develop' }
      }
      steps {
        script {
          docker.withRegistry("https://${env.REGISTRY}", 'nexus-push') {
            // A published tag is never overwritten (Nexus: redeploy not allowed). The same commit built
            // again (manual build, rebuild of Jenkins) already has its images, so they are not pushed again.
            sh '''
              for name in atmos-backend atmos-frontend; do
                image="$REGISTRY/$name:$IMAGE_TAG"
                if docker manifest inspect "$image" > /dev/null 2>&1; then
                  echo "$image is already in Nexus: not pushed again"
                else
                  docker push "$image"
                fi
              done
            '''
          }
        }
      }
    }
  }

  post {
    // Also after a failed build: local images must not fill the disk of the server.
    always {
      sh 'docker rmi "$REGISTRY/atmos-backend:$IMAGE_TAG" "$REGISTRY/atmos-frontend:$IMAGE_TAG" || true'
    }
  }
}
