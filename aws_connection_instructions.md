# Windows Guide: Connecting to AWS EC2 and S3

This guide provides step-by-step instructions specifically tailored for **Windows users** to securely connect to an Amazon EC2 instance and interact with Amazon S3.

---

## Part 1: Connecting to an AWS EC2 Instance

On Windows 10 and 11, the fastest and most standard way to connect to EC2 is by using the built-in **PowerShell** and OpenSSH client.

### Prerequisites:
- The **Public IP address** (or Public IPv4 DNS) of your EC2 instance.
- Your private key file (e.g., `my-key.pem`) downloaded from AWS.
- The default username for your instance (e.g., `ubuntu` for Ubuntu, `ec2-user` for Amazon Linux).

### Step 1: Fix `.pem` File Permissions (Crucial for Windows)
SSH strictly requires that your private key file is *not* accessible by anyone else on the computer. If you skip this step, Windows PowerShell will throw an "Unprotected Private Key File" or "bad permissions" error.

1. Locate your downloaded `.pem` file in Windows File Explorer.
2. Right-click the file and select **Properties**.
3. Go to the **Security** tab and click the **Advanced** button.
4. Click **Disable inheritance** near the bottom. 
5. When prompted, choose **"Remove all inherited permissions from this object."** (The list of users should now be empty).
6. Click **Add**, then click **"Select a principal"**.
7. Type your specific Windows username into the text box and click **Check Names**, then click **OK**.
8. Check the **Full control** box under Basic permissions, then click **OK**.
9. Click **Apply** and **OK** to close all properties windows.

### Step 2: Connect via PowerShell
1. Open **Windows PowerShell**.
2. Run the `ssh` command, pointing to the exact path of your newly-secured `.pem` file:
   ```powershell
   ssh -i "C:\path\to\your\key\my-key.pem" ubuntu@your-ec2-public-ip
   ```
   *(Example: `ssh -i "C:\Users\HP\Downloads\my-key.pem" ubuntu@198.51.100.1`)*
3. Type `yes` when asked if you want to continue connecting. You are now securely logged into your EC2 instance!

---

## Part 2: Connecting to and Interacting with AWS S3

To interact with S3 (for backups, uploads, or downloading files) directly from your Windows machine, you need to install the **AWS Command Line Interface (CLI)**.

### Step 1: Install the AWS CLI on Windows
1. Open **PowerShell** or Command Prompt.
2. Run the following command to download and install the official AWS CLI:
   ```powershell
   msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   ```
3. Follow the standard Windows installer prompts if they appear.
4. **Important:** Once the installation finishes, you must **close and reopen PowerShell**. 
5. Type `aws --version` to verify it is installed successfully.

### Step 2: Configure your AWS Credentials
You need an IAM User in AWS with `AmazonS3FullAccess` permissions. You will need their **Access Key ID** and **Secret Access Key**.

1. In PowerShell, type:
   ```powershell
   aws configure
   ```
2. Enter your details exactly when prompted:
   *   **AWS Access Key ID:** `AKIAIOSFODNN7EXAMPLE`
   *   **AWS Secret Access Key:** `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMP...`
   *   **Default region name:** e.g., `us-east-1` (make sure this matches the region where you created your S3 bucket)
   *   **Default output format:** `json`

### Step 3: Basic AWS S3 Commands for Windows
Now you can manage your S3 buckets directly from your PowerShell terminal!

*   **List all your S3 buckets:**
    ```powershell
    aws s3 ls
    ```

*   **Upload a file from your Windows PC to S3:**
    ```powershell
    aws s3 cp "C:\Users\HP\Desktop\my-local-file.txt" s3://your-bucket-name/
    ```

*   **Download a file from S3 to your Windows PC:**
    ```powershell
    aws s3 cp s3://your-bucket-name/remote-file.txt "C:\Users\HP\Desktop\"
    ```

*   **Sync a whole Windows folder to an S3 bucket (Great for backups!):**
    ```powershell
    aws s3 sync "C:\Users\HP\Desktop\DEVOPS CA_02\pep_project" s3://your-bucket-name/project-backup/
    ```
