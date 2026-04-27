import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createAccount,
  deleteAccount,
  findAccountById,
  listAccounts,
  updateAccount,
} from './service.js';
import type {
  Account,
  AccountRequestParams,
  AccountRow,
  CreateAccountBody,
  UpdateAccountBody,
} from './types.js';

function formatAccount(account: AccountRow): Account {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    sortCode: account.sortCode,
    name: account.name,
    accountType: account.accountType,
    balance: parseFloat(account.balance),
    currency: account.currency,
    createdTimestamp: account.createdAt.toISOString(),
    updatedTimestamp: account.updatedAt.toISOString(),
  };
}

export async function createAccountHandler(
  request: FastifyRequest<{ Body: CreateAccountBody }>,
  reply: FastifyReply,
) {
  const account = await createAccount({
    db: request.server.db,
    userId: request.user.userId,
    data: request.body,
  });
  return reply.status(201).send(formatAccount(account));
}

export async function listAccountsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const accountList = await listAccounts({ db: request.server.db, userId: request.user.userId });
  return reply.status(200).send({ accounts: accountList.map(formatAccount) });
}

export async function getAccountHandler(
  request: FastifyRequest<{ Params: AccountRequestParams }>,
  reply: FastifyReply,
) {
  const { accountId } = request.params;
  const account = await findAccountById({ db: request.server.db, accountId });

  if (!account) {
    return reply.status(404).send({ message: 'Account not found' });
  }
  if (account.userId !== request.user.userId) {
    return reply.status(403).send({ message: 'Forbidden' });
  }

  return reply.status(200).send(formatAccount(account));
}

export async function updateAccountHandler(
  request: FastifyRequest<{
    Params: AccountRequestParams;
    Body: UpdateAccountBody;
  }>,
  reply: FastifyReply,
) {
  const { accountId } = request.params;
  const result = await updateAccount({
    db: request.server.db,
    accountId,
    userId: request.user.userId,
    data: request.body,
  });

  if ('error' in result) {
    if (result.error === 'forbidden') {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    return reply.status(404).send({ message: 'Account not found' });
  }

  return reply.status(200).send(formatAccount(result.account));
}

export async function deleteAccountHandler(
  request: FastifyRequest<{ Params: AccountRequestParams }>,
  reply: FastifyReply,
) {
  const { accountId } = request.params;
  const result = await deleteAccount({ db: request.server.db, accountId, userId: request.user.userId });

  if ('error' in result) {
    if (result.error === 'forbidden') {
      return reply.status(403).send({ message: 'Forbidden' });
    }
    return reply.status(404).send({ message: 'Account not found' });
  }

  return reply.status(204).send();
}
