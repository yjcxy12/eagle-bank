import type { FastifyReply, FastifyRequest } from 'fastify';
import { createTransaction, findTransactionById, listTransactions } from './service.js';
import type {
  AccountIdParams,
  CreateTransactionBody,
  Transaction,
  TransactionIdParams,
  TransactionRow,
} from './types.js';

function formatTransaction(transaction: TransactionRow): Transaction {
  return {
    id: transaction.id,
    amount: parseFloat(transaction.amount),
    currency: transaction.currency,
    type: transaction.type,
    reference: transaction.reference,
    userId: transaction.userId,
    createdTimestamp: transaction.createdAt.toISOString(),
  };
}

export async function createTransactionHandler(
  request: FastifyRequest<{ Params: AccountIdParams; Body: CreateTransactionBody }>,
  reply: FastifyReply,
) {
  const { accountId } = request.params;
  const result = await createTransaction({
    db: request.server.db,
    accountId,
    userId: request.user.userId,
    data: request.body,
  });

  if ('error' in result) {
    if (result.error === 'forbidden') return reply.status(403).send({ message: 'Forbidden' });
    if (result.error === 'insufficient_funds') return reply.status(422).send({ message: 'Insufficient funds' });
    if (result.error === 'balance_exceeded') return reply.status(422).send({ message: 'Balance would exceed maximum' });
    return reply.status(404).send({ message: 'Account not found' });
  }

  return reply.status(201).send(formatTransaction(result.transaction));
}

export async function listTransactionsHandler(
  request: FastifyRequest<{ Params: AccountIdParams }>,
  reply: FastifyReply,
) {
  const { accountId } = request.params;
  const result = await listTransactions({
    db: request.server.db,
    accountId,
    userId: request.user.userId,
  });

  if ('error' in result) {
    if (result.error === 'forbidden') return reply.status(403).send({ message: 'Forbidden' });
    return reply.status(404).send({ message: 'Account not found' });
  }

  return reply.status(200).send({ transactions: result.transactions.map(formatTransaction) });
}

export async function getTransactionHandler(
  request: FastifyRequest<{ Params: TransactionIdParams }>,
  reply: FastifyReply,
) {
  const { accountId, transactionId } = request.params;
  const result = await findTransactionById({
    db: request.server.db,
    accountId,
    transactionId,
    userId: request.user.userId,
  });

  if ('error' in result) {
    if (result.error === 'forbidden') return reply.status(403).send({ message: 'Forbidden' });
    if (result.error === 'transaction_not_found') return reply.status(404).send({ message: 'Transaction not found' });
    return reply.status(404).send({ message: 'Account not found' });
  }

  return reply.status(200).send(formatTransaction(result.transaction));
}
