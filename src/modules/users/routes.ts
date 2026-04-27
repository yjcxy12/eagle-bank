import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { createUserHandler, deleteUserHandler, getUserHandler, updateUserHandler } from './controller.js';
import { createUserSchema, deleteUserSchema, getUserSchema, updateUserSchema } from './types.js';

export async function userRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/v1/users', { schema: createUserSchema }, createUserHandler);

  r.get(
    '/v1/users/:userId',
    {
      schema: getUserSchema,
      preHandler: app.authenticate,
    },
    getUserHandler,
  );

  r.patch(
    '/v1/users/:userId',
    {
      schema: updateUserSchema,
      preHandler: app.authenticate,
    },
    updateUserHandler,
  );

  r.delete(
    '/v1/users/:userId',
    {
      schema: deleteUserSchema,
      preHandler: app.authenticate,
    },
    deleteUserHandler,
  );
}
