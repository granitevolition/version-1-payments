# Version 1 Payments

A minimalist server for health check and deployment testing on Railway.

## Current Setup

This repository uses an ultra-minimal approach to avoid npm dependency issues:

1. **Single file server** (index.js) with no dependencies
2. **Dockerfile** with direct NodeJS execution
3. **Railway configuration** with Docker-based deployment

## Deployment on Railway

This application is configured for Railway deployment using the Dockerfile:

1. The Docker build uses only index.js from the repository
2. No package.json or npm is used in the process
3. The server handles /api/health checks to keep the deployment active

## Features

- HTTP server using built-in Node.js modules
- Health check endpoint at /api/health
- Simple HTML homepage
- Detailed logging

## Local Testing

To run locally:

```bash
node index.js
```

Then visit http://localhost:8080 or http://localhost:8080/api/health
