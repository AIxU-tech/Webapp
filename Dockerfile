# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first (better caching).
# .npmrc carries `legacy-peer-deps=true`, required because react-simple-maps@3
# still lists React 17 as its peer while the project runs on React 19.
COPY frontend/package*.json frontend/.npmrc ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Python production image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py ./
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/static/app ./static/app

# Enable gevent (monkey-patching + socketio async_mode) for WebSocket support
ENV USE_GEVENT=true

EXPOSE 5000

# Run with gunicorn + gevent-websocket worker (single worker for WebSocket).
# Flask-SocketIO + python-engineio require this worker class to handle the
# WebSocket upgrade; a plain gevent worker is not enough.
CMD ["gunicorn", "-k", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", "-w", "1", "--bind", "0.0.0.0:5000", "app:app"]
