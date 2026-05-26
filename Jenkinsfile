pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'pep_project'
        BACKEND_IMAGE        = 'pep_project-backend'
        FRONTEND_IMAGE       = 'pep_project-frontend'
        BACKEND_PORT         = '5000'
        FRONTEND_PORT        = '80'
        // AWS credentials must be configured in Jenkins Credentials Store
        // with ID 'aws-credentials' for S3 backup to work
        AWS_DEFAULT_REGION   = 'us-east-1'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        // ──────────────────────────────────────────────
        stage('Checkout') {
        // ──────────────────────────────────────────────
            steps {
                echo '📥 Checking out source code...'
                checkout scm
            }
        }

        // ──────────────────────────────────────────────
        stage('Validate Config') {
        // ──────────────────────────────────────────────
            steps {
                echo '🔍 Validating docker-compose config...'
                sh 'docker-compose config -q'
                echo '✅ Config is valid.'
            }
        }

        // ──────────────────────────────────────────────
        stage('Build Images') {
        // ──────────────────────────────────────────────
            steps {
                echo '🏗️  Building frontend and backend Docker images...'
                sh 'docker-compose build --no-cache frontend backend'
            }
        }

        // ──────────────────────────────────────────────
        stage('Deploy Stack') {
        // ──────────────────────────────────────────────
            steps {
                echo '🚀 Starting all services (MySQL, Redis, Backend, Frontend, Prometheus, Grafana)...'
                sh '''
                    docker-compose up -d
                    echo "Waiting for services to stabilise..."
                    sleep 15
                '''
            }
        }

        // ──────────────────────────────────────────────
        stage('Health Check') {
        // ──────────────────────────────────────────────
            steps {
                echo '🏥 Running health checks...'
                script {
                    // Backend API health
                    def backendOk = sh(
                        script: "curl -sf http://localhost:${BACKEND_PORT}/api/health",
                        returnStatus: true
                    ) == 0

                    // Frontend availability
                    def frontendOk = sh(
                        script: "curl -sf http://localhost:${FRONTEND_PORT}/ -o /dev/null",
                        returnStatus: true
                    ) == 0

                    if (!backendOk) {
                        error("❌ Backend health check FAILED on port ${BACKEND_PORT}")
                    }
                    if (!frontendOk) {
                        error("❌ Frontend health check FAILED on port ${FRONTEND_PORT}")
                    }

                    echo '✅ All health checks passed.'
                }
            }
        }

        // ──────────────────────────────────────────────
        stage('Smoke Test - URL Shortener') {
        // ──────────────────────────────────────────────
            steps {
                echo '🧪 Running smoke test: shorten a URL and verify redirect...'
                sh '''
                    # Create a short URL
                    RESPONSE=$(curl -sf -X POST http://localhost:${BACKEND_PORT}/api/shorten \
                        -H "Content-Type: application/json" \
                        -d '{"originalUrl":"https://www.example.com"}')

                    echo "Shorten response: $RESPONSE"

                    # Extract the shortId
                    SHORT_ID=$(echo "$RESPONSE" | grep -o '"shortId":"[^"]*"' | cut -d'"' -f4)
                    if [ -z "$SHORT_ID" ]; then
                        echo "❌ Smoke test FAILED: could not extract shortId"
                        exit 1
                    fi

                    echo "✅ Short URL created with ID: $SHORT_ID"

                    # Verify redirect resolves (should return 30x)
                    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/$SHORT_ID)
                    if [ "$HTTP_STATUS" -ge 300 ] && [ "$HTTP_STATUS" -lt 400 ]; then
                        echo "✅ Redirect working - HTTP $HTTP_STATUS"
                    else
                        echo "❌ Smoke test FAILED: redirect returned HTTP $HTTP_STATUS"
                        exit 1
                    fi
                '''
            }
        }

        // ──────────────────────────────────────────────
        stage('DB Backup to S3') {
        // ──────────────────────────────────────────────
            when {
                // Only run on main branch and when AWS credentials exist
                branch 'main'
            }
            steps {
                echo '💾 Backing up MySQL database to S3...'
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-credentials']]) {
                    sh 'chmod +x ./backup-to-s3.sh && ./backup-to-s3.sh'
                }
            }
        }
    }

    // ──────────────────────────────────────────────
    post {
    // ──────────────────────────────────────────────
        always {
            echo '📊 Final container status:'
            sh 'docker-compose ps'
        }
        success {
            echo '''
            ╔══════════════════════════════════════╗
            ║  ✅  PIPELINE SUCCEEDED               ║
            ║  App   → http://localhost             ║
            ║  API   → http://localhost:5000        ║
            ║  Grafana  → http://localhost:3000     ║
            ║  Prometheus → http://localhost:9090   ║
            ╚══════════════════════════════════════╝
            '''
        }
        failure {
            echo '❌ Pipeline FAILED. Fetching last 50 log lines from each service...'
            sh '''
                echo "=== BACKEND LOGS ===" && docker-compose logs --tail=50 backend  || true
                echo "=== FRONTEND LOGS ===" && docker-compose logs --tail=50 frontend || true
                echo "=== MYSQL LOGS ===" && docker-compose logs --tail=20 mysql     || true
            '''
        }
    }
}
