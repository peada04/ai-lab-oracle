# Use Node 22 as the base image
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Final production image
FROM node:22-slim
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Expose the port the app runs on
EXPOSE 3000

# Start the application using tsx (built-in to your package.json)
CMD ["npm", "start"]
