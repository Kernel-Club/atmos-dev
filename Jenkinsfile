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
  }
}
