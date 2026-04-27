import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { createDb, type Db } from '../db/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

async function dbPlugin(app: FastifyInstance, opts: { url: string }) {
  app.decorate('db', createDb(opts.url));
}

export default fp(dbPlugin);
