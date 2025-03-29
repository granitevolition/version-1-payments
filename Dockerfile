FROM node:16-alpine

WORKDIR /app

# Copy just the index.js file
COPY index.js .

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the application directly (no npm needed)
CMD ["node", "index.js"]
