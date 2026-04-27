import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { login, loginSchema } from './controller.js';

export async function authRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/v1/auth/login', {
    schema: loginSchema,
  }, login);
}
