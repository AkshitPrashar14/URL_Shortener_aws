#!/bin/bash

# Configuration
S3_BUCKET="your-s3-bucket-name"
DB_CONTAINER_NAME="pep_project-mysql-1" # As seen in docker-compose ps
DB_USER="root"
DB_PASS="rootpassword"
DB_NAME="urlshortener"
TIMESTAMP=$(date +"%F")
DB_BACKUP_FILE="$DB_NAME-$TIMESTAMP.sql"
PROJECT_DIR="$(pwd)"
ARCHIVE_FILE="project-files-$TIMESTAMP.tar.gz"

# Dump the database
echo "Starting database backup..."
docker exec $DB_CONTAINER_NAME /usr/bin/mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $DB_BACKUP_FILE

# Check if dump was successful
if [ $? -eq 0 ]; then
  echo "Database Backup created successfully."
  
  # Archive project files (docker-compose, Dockerfiles, etc)
  echo "Archiving project files..."
  # Exclude node_modules and .git to save space
  tar --exclude='node_modules' --exclude='.git' -czf $ARCHIVE_FILE -C $PROJECT_DIR .
  
  echo "Uploading to S3..."
  
  # Upload to S3
  aws s3 cp $DB_BACKUP_FILE s3://$S3_BUCKET/db-backups/$DB_BACKUP_FILE
  aws s3 cp $ARCHIVE_FILE s3://$S3_BUCKET/project-backups/$ARCHIVE_FILE
  
  if [ $? -eq 0 ]; then
    echo "Uploaded successfully to S3."
    rm $DB_BACKUP_FILE $ARCHIVE_FILE # Clean up local files
  else
    echo "Failed to upload to S3."
  fi
else
  echo "Database backup failed."
fi
