import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from './app';
import { pool, query } from './config/db';
import { env } from './config/env';
import { recordUncaughtError } from './middlewares/metrics.middleware';

const startServer = async (): Promise<void> => {
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const schema = await readFile(schemaPath, 'utf8');

  await pool.query(schema);
  await query('SELECT 1');
  console.log('PostgreSQL schema is ready');

  app.listen(env.PORT, () => {
    console.log(`API running at http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
};

void startServer().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Failed to initialize PostgreSQL or start API:', message);
  await pool.end();
  process.exitCode = 1;
});

let isShuttingDown = false;

const shutdown = (signal: string): void => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    try {
      await pool.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error while closing database:', message);
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  recordUncaughtError();
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  recordUncaughtError();
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});
