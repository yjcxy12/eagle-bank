import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { loginHandler } from './controller.js';
import { loginSchema } from './types.js';

export async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/v1/auth/login', { schema: loginSchema }, loginHandler);
}
