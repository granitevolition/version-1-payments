FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl

# Set working directory
WORKDIR /app

# Copy everything to the container
COPY . .

# Show file contents for debugging
RUN echo "Directory listing:" && ls -la

# Install express and pg for database
RUN npm install express cors pg

# Create super simple server file
RUN echo 'const express = require("express"); \
const app = express(); \
const PORT = process.env.PORT || 8080; \
app.get("/", (req, res) => { \
  res.send("<h1>Andikar Payment System</h1><p>Payment system is running!</p>"); \
}); \
app.get("/api/health", (req, res) => { \
  res.status(200).json({ status: "ok", message: "Server is running" }); \
}); \
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));' > minimal-server.js

# Create startup script that tries multiple server files
RUN echo '#!/bin/sh \n\
echo "Starting Andikar Payment System..." \n\
\n\
# Try server.js first \n\
if [ -f "server.js" ]; then \n\
  echo "Found server.js, starting..." \n\
  node server.js \n\
# Try app.js next \n\
elif [ -f "app.js" ]; then \n\
  echo "Found app.js, starting..." \n\
  node app.js \n\
# Try index.js next \n\
elif [ -f "index.js" ]; then \n\
  echo "Found index.js, starting..." \n\
  node index.js \n\
# Finally, fall back to minimal server \n\
else \n\
  echo "No server file found, using minimal server..." \n\
  node minimal-server.js \n\
fi' > start.sh && chmod +x start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Use the startup script
CMD ["sh", "start.sh"]
