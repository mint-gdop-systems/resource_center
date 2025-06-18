pipeline {
    agent none

    environment {
        DOCKER_REPO = 'rc'
       
        IMAGE_NAME = "${DOCKER_REPO}:latest
        DOCKER_CREDENTIALS_ID = 'tselot24_docker'
    }

    stages {
        stage('Clone Monorepo') {
            agent { label 'master' }
            steps {
                git branch: 'main', credentialsId: 'gdop_github', url: 'git@github.com/mint-gdop-systems/resource_center.git'
            }
        }

        
       //  stage('SonarQube Analysis') {
       //      agent { label 'master' }
       //      steps{
       //          script{
       //              def scannerHome = tool 'SonarScanner';
       //              withSonarQubeEnv("sonarQube") {
       //                sh "${scannerHome}/bin/sonar-scanner"
       //              }
       //          }
       //     }r
       // }
       

        stage('Build Image') {
           
                    agent { label 'agent-56' }
                  
                    steps {
                        
                            sh "docker build -t $IMAGE_NAME -f docker-compose-new.yml ."                        
                    }            
        }

        stage('Login to Docker Hub') {
            agent { label 'agent-56' }  
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "$DOCKER_CREDENTIALS_ID",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                }
            }
        }

        
        stage('Push ') {
           agent { label 'agent-56' }  
            steps {
                sh "docker push $IMAGE_NAME"
            }              
        }

      stage('Deploy') {
            agent { label 'agent-56' }          
            steps {
                script {
                    
                    sh '''
                    docker stack rm rc_new || true
                    docker stack deploy -c docker-compose-new.yml rc_new
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
    }
}
