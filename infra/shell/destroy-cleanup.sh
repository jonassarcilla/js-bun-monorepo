#!/bin/bash

usage="Usage: $(basename "$0") stack-name region-name [aws-cli-opts]

where:
  stack-name   - the stack name
  region-name  - the region name
"

if [ "$1" == "-h" ] || [ "$1" == "--help" ] || [ "$1" == "help" ] || [ "$1" == "usage" ] ; then
  echo "$usage"
  exit -1
fi

if [ -z "$1" ] || [ -z "$2" ] ; then
  echo "$usage"
  exit -1
fi

shopt -s failglob
set -eu -o pipefail

deployment_bucket="${1}-s3-bucket"
logging_bucket="${1}-s3-logging"
region_name="${2:-ap-southeast-1}" # Default to us-east-1 if no region provided
frontend_stack="${1}-frontend-stack"

# empty s3 buckets
perform_empty_s3_buckets() {
    # Delete all objects
    if ! aws s3api delete-objects --bucket $deployment_bucket \
        --delete "$(aws s3api list-object-versions --bucket $deployment_bucket --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}')" --output text ; then
        echo -e "\nBucket ${deployment_bucket} already empty"
    else
        echo -e "\nBucket ${deployment_bucket} contents exist, attempting to delete ..."
    fi

    # Delete all DeleteMarker Objects
    if ! aws s3api delete-objects --bucket ${deployment_bucket} \
        --delete "$(aws s3api list-object-versions --bucket ${deployment_bucket} --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')" --output text ; then
        echo -e "\nBucket ${deployment_bucket} already empty"
    else
        echo -e "\nBucket ${deployment_bucket} DeleteMarker contents exist, attempting to delete ..."
    fi

    echo "Finished. Emptying ${deployment_bucket} bucket successful!"

    if ! aws s3api delete-objects --bucket $logging_bucket \
        --delete "$(aws s3api list-object-versions --bucket $logging_bucket --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}')" --output text ; then
        echo -e "\nBucket ${logging_bucket} already empty"
    else
        echo -e "\nBucket ${logging_bucket} contents exist, attempting to delete ..."
    fi

    # Delete all DeleteMarker Objects
    if ! aws s3api delete-objects --bucket ${logging_bucket} \
        --delete "$(aws s3api list-object-versions --bucket ${logging_bucket} --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')" --output text ; then
        echo -e "\nBucket ${logging_bucket} already empty"
    else
        echo -e "\nBucket ${logging_bucket} DeleteMarker contents exist, attempting to delete ..."
    fi

    echo "Finished. Emptying ${logging_bucket} bucket successful!"
}

perform_empty_s3_buckets $deployment_bucket $logging_bucket

sleep 15

# Loop until the stack is complete or failed
while true; do
    status=$(aws cloudformation describe-stacks --stack-name "$frontend_stack" --region "$region_name" --query 'Stacks[0].StackStatus' --output text)

    echo "status: ${status}"

    if [ "$status" = "CREATE_COMPLETE" ] || [ "$status" = "UPDATE_COMPLETE" ] || [ "$status" = "UPDATE_ROLLBACK_COMPLETE" ]; then
        echo "CloudFormation stack '$frontend_stack' in '$region_name' is complete: $status"
        exit 0
    elif [ "$status" = "CREATE_FAILED" ] || [ "$status" = "DELETE_FAILED" ] || [ "$status" = "UPDATE_FAILED" ] || [ "$status" = "UPDATE_ROLLBACK_FAILED" ] || [ "$status" = "ROLLBACK_FAILED" ]; then
        echo "CloudFormation stack '$frontend_stack' in '$region_name' failed: $status"
        exit 1
    else
        echo "CloudFormation stack '$frontend_stack' in '$region_name' is in progress: $status"
        perform_empty_s3_buckets $deployment_bucket $logging_bucket
        break
    fi

    sleep 5 # Wait 30 seconds before checking again.  Adjust as needed.
done