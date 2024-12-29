/**
 * Server Entry Point
 * Version: 1.0.0
 * 
 * Initializes and manages the HTTP server for the SaaS Benchmarks Platform
 * with comprehensive error handling, graceful shutdown, and monitoring.
 */

import http from 'http'; // v18.x
import { app } from './app';
import { serverConfig } from './config/server.config';
import { createLogger } from './utils/logger.utils';

// Initialize logger
const logger = createLogger();

// Track active connections for graceful shutdown
const connections = new Map<string, http.Socket>();
let isShuttingDown = false;

/**
 * Creates and initializes HTTP server with enhanced error handling
 * and connection tracking
 */
const startServer = async (): Promise<http.Server> => {
  // Create HTTP server instance
  const server = http.createServer(app);

  // Configure keep-alive timeout
  server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
  server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

  // Track connections for graceful shutdown
  server.on('connection', (socket: http.Socket) => {
    const id = `${socket.remoteAddress}:${socket.remotePort}`;
    connections.set(id, socket);
    
    socket.on('close', () => {
      connections.delete(id);
    });
  });

  // Add health check endpoint
  app.get('/health', (req, res) => {
    res.status(isShuttingDown ? 503 : 200).json({
      status: isShuttingDown ? 'shutting_down' : 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Start listening
  return new Promise((resolve, reject) => {
    try {
      // Wait for startup delay if configured
      const startupDelay = serverConfig.startupDelay || 0;
      setTimeout(() => {
        server.listen(serverConfig.port, () => {
          logger.info(`Server started successfully`, {
            port: serverConfig.port,
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
          });
          resolve(server);
        });
      }, startupDelay);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Handles graceful server shutdown with connection draining
 * @param server HTTP server instance
 */
const handleShutdown = async (server: http.Server): Promise<void> => {
  logger.info('Initiating graceful shutdown');
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    logger.info('Server stopped accepting new connections');
  });

  // Set shutdown timeout
  const shutdownTimeout = serverConfig.shutdownTimeout || 15000;
  const forcedShutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, shutdownTimeout);

  try {
    // Close existing connections
    for (const [id, socket] of connections) {
      logger.debug(`Closing connection: ${id}`);
      socket.destroy();
      connections.delete(id);
    }

    logger.info('Graceful shutdown completed');
    clearTimeout(forcedShutdownTimer);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

/**
 * Handles uncaught errors and exceptions
 * @param error Error object
 * @param source Error source identifier
 */
const handleError = (error: Error, source: string): void => {
  logger.error(`${source} error:`, {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  if (source === 'unhandledRejection') {
    // Continue execution for unhandled rejections
    return;
  }

  // Exit for uncaught exceptions after cleanup
  process.exit(1);
};

// Start server
startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Register signal handlers for graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  const server = http.getServer();
  if (server) {
    await handleShutdown(server);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  const server = http.getServer();
  if (server) {
    await handleShutdown(server);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  handleError(error, 'uncaughtException');
});

process.on('unhandledRejection', (error: Error) => {
  handleError(error, 'unhandledRejection');
});