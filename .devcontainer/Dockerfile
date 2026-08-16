# Use the official Node.js image
FROM node:20-alpine

# Create a non-root user
RUN addgroup -g 1000 -S node && \
    adduser -S node -u 1000

# Install dependencies
RUN apk add --no-cache git bash curl

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER node

# Install npm dependencies (this will be cached)
COPY package.json package-lock.json* ./
RUN npm ci 2>&1 || npm install

# Copy the rest of the workspace
COPY . .

# Expose ports
EXPOSE 5173 3000

# Set environment variables
ENV NODE_ENV=development

# Keep container running
CMD ["sleep", "infinity"]
