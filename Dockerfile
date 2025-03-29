FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# First, copy everything to build context
COPY . .

# Check if the backend directory exists and show directory structure
RUN ls -la && echo "Current directory contents:" && \
    if [ -d "backend" ]; then \
      echo "backend directory found!"; \
      ls -la backend; \
    else \
      echo "backend directory NOT found! Showing all contents:"; \
      find . -type d | sort; \
    fi

# Install dependencies
RUN cd backend && npm install

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Database debugging info at startup
CMD echo "Starting server..." && \
    echo "Environment variables:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "DATABASE_URL exists: $(if [ -n "$DATABASE_URL" ]; then echo 'YES'; else echo 'NO'; fi)" && \
    echo "DATABASE_PUBLIC_URL exists: $(if [ -n "$DATABASE_PUBLIC_URL" ]; then echo 'YES'; else echo 'NO'; fi)" && \
    echo "Starting application from /app/backend directory" && \
    cd backend && \
    node server.js