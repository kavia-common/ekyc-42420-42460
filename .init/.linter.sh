#!/bin/bash
cd /home/kavia/workspace/code-generation/ekyc-42420-42460/EKYCWebApplication
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

