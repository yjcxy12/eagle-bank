import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import {
  createAccountHandler,
  deleteAccountHandler,
  getAccountHandler,
  listAccountsHandler,
  updateAccountHandler,
} from './controller.js';
import {
  createAccountSchema,
  deleteAccountSchema,
  getAccountSchema,
  listAccountsSchema,
  updateAccountSchema,
} from './types.js';

export async function accountRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post('/v1/accounts', { schema: createAccountSchema }, createAccountHandler);

  r.get('/v1/accounts', { schema: listAccountsSchema }, listAccountsHandler);

  r.get('/v1/accounts/:accountId', { schema: getAccountSchema }, getAccountHandler);

  r.patch('/v1/accounts/:accountId', { schema: updateAccountSchema }, updateAccountHandler);

  r.delete('/v1/accounts/:accountId', { schema: deleteAccountSchema }, deleteAccountHandler);
}
