FROM node:16-alpine

WORKDIR /app

# Install curl for health checks
RUN apk --no-cache add curl

# Copy base server
COPY base-server.js .

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "base-server.js"]
