# Scalable URL Shortener

A production-ready Scalable URL Shortener (Bitly clone) built with Node.js, Express, React, MySQL, and Redis. It features a complete monitoring stack (Prometheus & Grafana) and relies exclusively on Docker Compose for orchestration.

## Architecture

*   **Frontend**: React + Vite + Vanilla CSS (Dynamic, modern UI).
*   **Backend**: Node.js + Express REST API.
*   **Database**: MySQL (Persistent storage for URLs and analytics).
*   **Cache**: Redis (Lightning-fast short-to-long URL resolution).
*   **Monitoring**: Prometheus (Metrics collection) + Grafana (Pre-configured dashboard visualization).
*   **CI/CD**: Jenkins Declarative Pipeline (`Jenkinsfile`).

---

## 1. Local Setup

### Prerequisites
*   Docker & Docker Compose installed.
*   Git installed.

### Running Locally
1. Clone the repository:
   \`\`\`bash
   git clone <your-repo-url>
   cd pep_project
   \`\`\`
2. Start the entire stack:
   \`\`\`bash
   docker-compose up -d --build
   \`\`\`
3. Access the services:
   *   **Frontend Web UI**: http://localhost
   *   **Backend API**: http://localhost:5000
   *   **Prometheus**: http://localhost:9090
   *   **Grafana**: http://localhost:3000 (User: `admin`, Password: `admin`)

---

## 2. Target EC2 Configuration Instructions

### Step 2.1: Provision EC2 Instance
1. Launch an AWS EC2 Instance (e.g., Ubuntu 22.04 LTS).
2. Attach an **IAM Role** with `AmazonS3FullAccess` if you plan to use the `backup-to-s3.sh` script.
3. Configure the Security Group to allow inbound traffic on:
   *   `Port 22` (SSH for Jenkins & Admin)
   *   `Port 80` (HTTP for the Web Application)
   *   `Port 5000` (Backend API)
   *   `Port 3000` (Grafana)
   *   `Port 9090` (Prometheus)

### Step 2.2: Install Docker and Docker Compose
SSH into your EC2 instance and run the following commands:
\`\`\`bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and log back in to apply docker group permissions!
\`\`\`

---

## 3. Jenkins CI/CD Setup

### Step 3.1: Jenkins Server Prep
1. Ensure Jenkins is installed (either on a separate EC2 instance or locally).
2. Install the **Docker Pipeline** plugin and **GitHub Integration** plugin.
3. Configure Jenkins to use the private SSH key of your Target EC2 instance so it can deploy over SSH (Optional, but recommended for remote deployment; our `Jenkinsfile` assumes Jenkins is running on the target server or can run `docker-compose` directly).
   *   *Note*: The provided `Jenkinsfile` runs `docker-compose up -d` natively, which means Jenkins must have the Docker socket mounted or have `docker-compose` installed locally on its build agent.

### Step 3.2: GitHub Webhooks
1. In your GitHub repository, go to **Settings > Webhooks**.
2. Click **Add webhook**.
3. Set the **Payload URL** to: `http://<your-jenkins-server-ip>:8080/github-webhook/`.
4. Set **Content type** to `application/json`.
5. Choose **Just the push event**.
6. Save the webhook. Now, every push to the `main` branch will automatically trigger the Jenkins pipeline.

---

## 4. Database & Project Backup to S3

We have provided a script `backup-to-s3.sh`. To configure automated backups:

1. SSH into the target EC2 instance.
2. Install the AWS CLI (`sudo apt install awscli`).
3. Make the script executable: `chmod +x backup-to-s3.sh`.
4. Edit the script to replace `your-s3-bucket-name` with your actual S3 bucket.
5. Open the crontab editor: `crontab -e`.
6. Add the following line to run the backup daily at 2 AM:
   ```bash
   0 2 * * * /home/ubuntu/pep_project/backup-to-s3.sh >> /home/ubuntu/backup.log 2>&1
   ```

---

## 5. Monitoring Stack (Grafana & Prometheus)

- **Prometheus** scrapes metrics from the Node.js backend (e.g., total links created, total redirects) at `/metrics`.
- **Grafana** is pre-provisioned via the `./monitoring/grafana/provisioning` directory. 
- Upon logging into Grafana (http://your-ec2-ip:3000), you will immediately see the **URL Shortener Metrics** dashboard tracking your application's traffic and performance.
