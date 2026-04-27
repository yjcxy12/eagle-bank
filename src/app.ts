import sensible from '@fastify/sensible';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.register(sensible);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
