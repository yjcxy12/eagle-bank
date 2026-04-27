import type { FastifyReply, FastifyRequest } from 'fastify';
import { createUser, findUserById, updateUser } from './service.js';
import type { CreateUserBody, GetUserParams, UpdateUserBody, User, UserRow } from './types.js';

function formatUser(user: UserRow): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    createdTimestamp: user.createdAt.toISOString(),
    updatedTimestamp: user.updatedAt.toISOString(),
  };
}

export async function createUserHandler(
  request: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply,
) {
  const result = await createUser(request.server.db, request.body);

  if ('error' in result) {
    return reply.status(400).send({ message: 'Email already in use' });
  }

  return reply.status(201).send(formatUser(result.user));
}

export async function updateUserHandler(
  request: FastifyRequest<{ Params: GetUserParams; Body: UpdateUserBody }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;

  if (request.user.userId !== userId) {
    return reply.status(403).send({ message: 'Forbidden' });
  }

  const result = await updateUser(request.server.db, { userId }, request.body);

  if ('error' in result) {
    if (result.error === 'not_found') {
      return reply.status(404).send({ message: 'User not found' });
    }
    return reply.status(400).send({ message: 'Email already in use' });
  }

  return reply.status(200).send(formatUser(result.user));
}

export async function getUserHandler(
  request: FastifyRequest<{ Params: GetUserParams }>,
  reply: FastifyReply,
) {
  const { userId } = request.params;

  if (request.user.userId !== userId) {
    return reply.status(403).send({ message: 'Forbidden' });
  }

  const user = await findUserById(request.server.db, { userId });

  if (!user) {
    return reply.status(404).send({ message: 'User not found' });
  }

  return reply.status(200).send(formatUser(user));
}
