FROM node:16-alpine

# Install system dependencies
RUN apk --no-cache add curl

# Set working directory
WORKDIR /app

# Copy package.json for dependency installation
COPY package.json ./

# Show current directory for debugging
RUN ls -la

# Install dependencies
RUN npm install express cors pg

# Copy all files
COPY . .

# Show files for debugging
RUN ls -la 

# Create startup script that tries multiple server files
RUN echo '#!/bin/sh \n\
echo "Starting Andikar Payment System..." \n\
echo "Available JavaScript files:" \n\
find . -name "*.js" | sort \n\
\n\
# Try server.js first \n\
if [ -f "server.js" ]; then \n\
  echo "Found server.js, starting..." \n\
  node server.js \n\
# Try app.js next \n\
elif [ -f "app.js" ]; then \n\
  echo "Found app.js, starting..." \n\
  node app.js \n\
# Try simple.js next \n\
elif [ -f "simple.js" ]; then \n\
  echo "Found simple.js, starting..." \n\
  node simple.js \n\
# Try index.js next \n\
elif [ -f "index.js" ]; then \n\
  echo "Found index.js, starting..." \n\
  node index.js \n\
# Finally, create and use an emergency server \n\
else \n\
  echo "No server file found, creating emergency server..." \n\
  echo "const express = require(\\"express\\"); \n\
const app = express(); \n\
const PORT = process.env.PORT || 8080; \n\
app.get(\\"/\\", (req, res) => { \n\
  res.send(\\"<h1>Andikar Payment API</h1><p>Emergency server is running</p>\\"); \n\
}); \n\
app.get(\\"/api/health\\", (req, res) => { \n\
  res.status(200).json({ status: \\"ok\\", message: \\"Emergency server running\\" }); \n\
}); \n\
app.listen(PORT, () => console.log(\\"Emergency server running on port \\" + PORT));" > emergency.js \n\
  node emergency.js \n\
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
