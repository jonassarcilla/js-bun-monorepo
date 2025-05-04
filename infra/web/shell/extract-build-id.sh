#!/bin/bash

# chmod +x extract_build_id.sh
script_dir=$(dirname "$0")

file_path="$script_dir/../../../apps/web/.next/BUILD_ID"

chmod +x $file_path

if [ -f "$file_path" ]; then
    file_content=$(cat $file_path)
    echo "${file_content}"
    dir_file_path="$script_dir/.."

    # Remove BUILD_ID
    sed -i '/^BUILD_ID=/d' "${dir_file_path}/.env"

    # Write BUILD_ID
    echo -e "BUILD_ID=\"$file_content\"" >> "${dir_file_path}/.env"
else
    echo "Error: File not found at $file_path (relative to script's execution directory)"
fi