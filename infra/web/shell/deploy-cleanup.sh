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
}

perform_empty_s3_buckets $deployment_bucket $logging_bucket