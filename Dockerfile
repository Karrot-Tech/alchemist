# Stage 1: Build React Frontend
FROM node:18-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Setup Express Backend
FROM node:18-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --production
COPY server/ ./

# Copy built frontend assets from Stage 1 to a location accessible by server
# The server.js expects '../client/dist' relative to itself. 
# So we place it in /app/client/dist
COPY --from=client-build /app/client/dist /app/client/dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
