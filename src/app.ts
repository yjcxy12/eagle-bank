import sensible from '@fastify/sensible';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import { config } from './config.js';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';

export function buildApp(databaseUrl = config.databaseUrl) {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        message: 'Validation failed',
        details: error.validation.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          type: issue.code,
        })),
      });
    }
    reply.send(error);
  });

  app.register(sensible);
  app.register(dbPlugin, { url: databaseUrl });
  app.register(jwtPlugin);
  app.register(authRoutes);
  app.register(userRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
