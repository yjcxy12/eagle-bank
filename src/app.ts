import Fastify from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import sensible from '@fastify/sensible'

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

  app.register(sensible)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
