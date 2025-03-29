FROM node:16-alpine

WORKDIR /app

# Copy package.json first
COPY package.json ./

# Run npm install to satisfy Railway's expectations
RUN npm install

# Copy the index.js file
COPY index.js ./

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]
