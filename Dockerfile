FROM node:16-alpine

WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy the rest of the application
COPY backend ./backend
COPY database ./database

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "backend/server.js"]
