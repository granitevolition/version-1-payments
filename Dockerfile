FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl postgresql-client

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Run diagnostic to help with debugging
RUN ls -la && echo "Repository content copied to image"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Create a wrapper script to handle startup
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Andikar Payment API..."' >> /app/start.sh && \
    echo 'echo "Database URL: $(if [ -n "$DATABASE_URL" ]; then echo "Configured"; else echo "Not configured"; fi)"' >> /app/start.sh && \
    echo 'echo "Database Public URL: $(if [ -n "$DATABASE_PUBLIC_URL" ]; then echo "Configured"; else echo "Not configured"; fi)"' >> /app/start.sh && \
    echo 'echo "Current directory content:"' >> /app/start.sh && \
    echo 'ls -la' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Health check - checks /api/health on the local server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start the application using the wrapper script
CMD ["/app/start.sh"]
