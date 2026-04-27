import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import {
  createTransactionHandler,
  getTransactionHandler,
  listTransactionsHandler,
} from './controller.js';
import { createTransactionSchema, getTransactionSchema, listTransactionsSchema } from './types.js';

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/v1/accounts/:accountId/transactions',
    { schema: createTransactionSchema },
    createTransactionHandler,
  );

  r.get(
    '/v1/accounts/:accountId/transactions',
    { schema: listTransactionsSchema },
    listTransactionsHandler,
  );

  r.get(
    '/v1/accounts/:accountId/transactions/:transactionId',
    { schema: getTransactionSchema },
    getTransactionHandler,
  );
}
