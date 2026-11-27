// CI pipeline of Atmos for the on-premise platform (Jenkins on the jenkins server).
// Checks, tests and packages every change of develop into versioned images in Nexus.
// Security and quality checks run before the images are built (US-07).
// The job that runs it is defined in atmos-jenkins.

// Tool images (scanners, Python, Node) run with the workspace of this job only: a subpath of the
// volume jenkins_home is mounted at the same path. They never see the secrets of Jenkins
// (/run/secrets) or the rest of jenkins_home, unlike `agent { docker }`, which mounts every volume
// of the Jenkins container (--volumes-from). HOME is a folder in the workspace, so caches are kept.
def runTool(String image, String command, String envArgs = '') {
  sh """
    docker run --rm -u 1000:1000 \\
      --mount type=volume,src=jenkins_home,dst="\$WORKSPACE",volume-subpath="workspace/\$JOB_NAME" \\
      -w "\$WORKSPACE" -e HOME="\$WORKSPACE/.tool-home" ${envArgs} \\
      --entrypoint sh ${image} -c '${command}'
  """
}

pipeline {
  agent any

  environment {
    REGISTRY = 'nexus.atmos.lan:5000'
    // Branch from the job parameter (atmos-jenkins); a build without the parameter is develop.
    BUILD_BRANCH = "${params.BRANCH ?: 'develop'}"

    // Tool images, pinned by digest: a tag can be moved to other content, a digest cannot
    // (the Trivy images were replaced by malware under existing tags in March 2026).
    GITLEAKS_IMAGE = 'zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f'
    PYTHON_IMAGE   = 'python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b'
    NODE_IMAGE     = 'node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a'
    SONAR_IMAGE    = 'sonarsource/sonar-scanner-cli:12.1.0.3225_8.0.1@sha256:a429d20d22c8d97b9a10ea5585f1c56d2a54796f0ae3da06c7a1a49eec78e6c2'
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
        sh 'mkdir -p .tool-home'   // HOME of the tool containers (runTool)
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

    // Secrets: every commit of the history is checked for leaked keys, tokens and passwords.
    // --redact keeps the values out of the log and the report; any finding stops the build.
    stage('Secrets') {
      steps {
        runTool(env.GITLEAKS_IMAGE, 'gitleaks git . --redact --no-banner --report-format sarif --report-path gitleaks.sarif')
      }
      post {
        always {
          // Findings on the build page (Warnings plugin) and the report kept with the build.
          recordIssues enabledForFailure: true, tools: [sarif(pattern: 'gitleaks.sarif', id: 'gitleaks', name: 'Gitleaks')]
          archiveArtifacts artifacts: 'gitleaks.sarif', allowEmptyArchive: true
        }
      }
    }

    // Lint and tests run in temporary containers (runTool): nothing is installed on the server.
    // A failed command stops the build.
    stage('Backend: lint and tests') {
      steps {
        runTool(env.PYTHON_IMAGE, 'cd backend && python -m venv .venv && .venv/bin/pip install --quiet --no-cache-dir -r requirements.txt')
        runTool(env.PYTHON_IMAGE, 'cd backend && .venv/bin/ruff check .')
        // Coverage report for the code analysis below
        runTool(env.PYTHON_IMAGE, 'cd backend && .venv/bin/pytest --cov=app --cov-report=xml:coverage.xml --junitxml=pytest.xml')
      }
      post {
        always {
          junit testResults: 'backend/pytest.xml', allowEmptyResults: true
        }
      }
    }

    stage('Frontend: lint') {
      steps {
        runTool(env.NODE_IMAGE, 'cd frontend && npm ci --no-audit --no-fund')
        runTool(env.NODE_IMAGE, 'cd frontend && npm run lint')
      }
    }

    // Code analysis: bugs, vulnerabilities and code smells with the test coverage in SonarQube Cloud
    // (settings in sonar-project.properties). The scanner waits for the quality gate; a failed gate
    // stops the build. Each branch is a separate branch in SonarQube Cloud.
    stage('Code analysis') {
      environment {
        SONAR_USER_HOME = "${env.WORKSPACE}/.sonar"   // cache of the analyzers, kept between builds
      }
      steps {
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          // -e NAME passes the value from the environment of this step: the token is not in the command
          runTool(env.SONAR_IMAGE, 'sonar-scanner -Dsonar.branch.name="$BUILD_BRANCH"',
                  '-e SONAR_TOKEN -e SONAR_USER_HOME -e BUILD_BRANCH')
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
