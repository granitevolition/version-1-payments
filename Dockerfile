FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Set working directory
WORKDIR /app

# Print current directory
RUN pwd && ls -la

# First, copy the entire repo to diagnose the directory structure
COPY . .

# Log the directory structure for debugging
RUN echo "=== DIRECTORY STRUCTURE ===" && \
    find . -type d -not -path "*/node_modules/*" -not -path "*/\.*" | sort && \
    echo "=== ROOT DIRECTORY FILES ===" && \
    ls -la && \
    echo "=== BACKEND DIRECTORY FILES ===" && \
    ls -la backend || echo "Backend directory not found"

# Install dependencies from either location
RUN if [ -f "backend/package.json" ]; then \
      echo "Installing from backend/package.json" && \
      cd backend && npm install; \
    elif [ -f "package.json" ]; then \
      echo "Installing from root package.json" && \
      npm install; \
    else \
      echo "No package.json found!" && \
      exit 1; \
    fi

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Create the start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'echo "Database environment variables:"' >> /app/start.sh && \
    echo 'echo "- DATABASE_URL: $(if [ -n \"$DATABASE_URL\" ]; then echo \"Defined\"; else echo \"Not defined\"; fi)"' >> /app/start.sh && \
    echo 'echo "- DATABASE_PUBLIC_URL: $(if [ -n \"$DATABASE_PUBLIC_URL\" ]; then echo \"Defined\"; else echo \"Not defined\"; fi)"' >> /app/start.sh && \
    echo 'if [ -d "backend" ]; then' >> /app/start.sh && \
    echo '  echo "Found backend directory, running database migration..."' >> /app/start.sh && \
    echo '  cd backend' >> /app/start.sh && \
    echo '  node scripts/migrate.js || echo "Migration failed but continuing..."' >> /app/start.sh && \
    echo '  echo "Starting server from backend directory"' >> /app/start.sh && \
    echo '  node server.js' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "No backend directory found, running from root"' >> /app/start.sh && \
    echo '  node server.js' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["/app/start.sh"]