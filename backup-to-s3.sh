#!/bin/bash

# Configuration
S3_BUCKET="your-s3-bucket-name"
DB_CONTAINER_NAME="urlshortener-mysql-1" # Or whatever docker-compose names it
DB_USER="root"
DB_PASS="rootpassword"
DB_NAME="urlshortener"
TIMESTAMP=$(date +"%F")
BACKUP_FILE="$DB_NAME-$TIMESTAMP.sql"

# Dump the database
echo "Starting database backup..."
docker exec $DB_CONTAINER_NAME /usr/bin/mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Check if dump was successful
if [ $? -eq 0 ]; then
  echo "Backup created successfully. Uploading to S3..."
  
  # Upload to S3
  aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/db-backups/$BACKUP_FILE
  
  if [ $? -eq 0 ]; then
    echo "Uploaded successfully to S3."
    rm $BACKUP_FILE # Clean up local file
  else
    echo "Failed to upload to S3."
  fi
else
  echo "Database backup failed."
fi
