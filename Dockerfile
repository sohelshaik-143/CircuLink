# Stage 1: Build the Vite Frontend
FROM node:20-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend application source
COPY server.js ./
COPY api/ ./api/
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY database/ ./database/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY services/ ./services/

# Copy compiled frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose default port
EXPOSE 5000
ENV PORT=5000

# Start unified All-in-One server (Backend API + WebSockets + Frontend SPA)
CMD ["node", "server.js"]
