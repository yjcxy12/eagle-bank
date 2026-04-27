# Architecture Decisions

## API Response Shape

**Decision:** Conform to the provided `openapi.yaml` spec as-is.

**Ideally:** In a production system, API responses would be wrapped in a consistent envelope:
- Single resource: `{ "data": { ... }, "meta": { ... } }`
- Collections: `{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20 } }`

This makes pagination, metadata, and future extensibility cleaner and more consistent.

**For this exercise:** The spec defines direct resource responses (e.g. `UserResponse`, `BankAccountResponse`) and named array wrappers for lists (e.g. `{ "accounts": [...] }`, `{ "transactions": [...] }`). We conform to those shapes exactly. Pagination is not defined in the spec and has not been added.

---

## Soft Deletes

**Decision:** Use a `deletedAt` nullable timestamp instead of a boolean `isDeleted` or status enum.

**Reasoning:** Records a precise deletion time for audit purposes, and leaves the door open for future recovery workflows. API returns 404 for soft-deleted resources — callers never see the internal state.

**Scope:** `users` and `accounts` only. Transactions are immutable ledger entries and are never deleted.

---

## Balance Constraints

**Decision:** No DB-level check constraint on `accounts.balance`. The spec defines `minimum: 0.00` in the response schema, enforced at the application layer only.

**Reasoning:** Keeping the DB flexible allows future product changes (e.g. overdraft support) without a schema migration. The current business rule (no withdrawals below zero) lives in code where it is easy to change.

---

## Transaction `userId` Denormalisation

**Decision:** Store `userId` directly on the `transactions` table in addition to `accountId`.

**Reasoning:** Avoids a join on every transaction query, and provides a permanent audit record of who initiated the transaction — even if account ownership changes in the future.

---

## Sort Code

**Decision:** Store `sortCode` as a column on `accounts` rather than hardcoding `"10-10-10"` in response mapping.

**Reasoning:** Makes the system flexible for future sort codes without a schema migration, and is the correct relational design for a banking domain.

---

## Account Route Parameter: UUID `accountId` vs `accountNumber`

**Decision:** Use the internal UUID `accountId` as the route parameter (`/v1/accounts/:accountId`) instead of the `accountNumber` (`01XXXXXX`) defined in the OpenAPI spec.

**Why UUID is safer:**

- `accountNumber` is a user-facing, predictable, sequential identifier (`01000001`, `01000002`, …). Using it in URLs makes accounts trivially enumerable — an attacker can iterate through all valid numbers to probe for resources (IDOR). Even with ownership checks, it leaks information about how many accounts exist.
- A UUID (`crypto.randomUUID()`) has 122 bits of entropy and is not guessable. An attacker cannot enumerate or predict valid account IDs.
- UUIDs are the DB primary key — lookups by `id` hit the primary index directly, avoiding a secondary index scan on `account_number`.

**Known trade-off — spec divergence:**

The `openapi.yaml` `BankAccountResponse` schema does **not** include an `accountId` field. It returns `accountNumber`, `sortCode`, `name`, `balance`, etc. This means a client receiving a created/listed account has no way to obtain the `accountId` needed to call `GET/PATCH/DELETE /v1/accounts/:accountId` or the transaction endpoints.

In a real implementation this would be resolved by adding `id` to the `BankAccountResponse` schema. For this exercise we accept the divergence as a conscious trade-off — the routing is secure by design, and the response schema can be extended when the spec is updated.

---

## Further Work: Refresh Token Auth

Current auth issues a single JWT access token with no expiry. Production should use short-lived access tokens paired with long-lived refresh tokens.

**Token strategy**

| | Access Token | Refresh Token |
|---|---|---|
| Lifetime | 15min–1hr | 7–30 days |
| Transport | `Authorization: Bearer` header | `HttpOnly; Secure; SameSite=Strict` cookie |
| Storage | JS memory (never localStorage) | Cookie only — never accessible to JS |

**DB schema** — add a `refresh_tokens` table:

```sql
refresh_tokens (
  id          varchar PK,         -- rnd-{nanoid}
  user_id     varchar FK → users,
  token_hash  varchar UNIQUE,     -- sha256 of token, never store plaintext
  expires_at  timestamp,
  created_at  timestamp
)
```

**New endpoints required**

- `POST /v1/auth/refresh` — validate token hash in DB, rotate (delete old + issue new), return new access token
- `POST /v1/auth/logout` — delete token from DB, clear cookie

**Token rotation** — on every `/auth/refresh`:
1. Look up token hash in DB, verify `expires_at`
2. Delete it immediately (one-time use)
3. Issue new refresh token (stored as hash) + new short-lived access token
4. If a token is replayed after rotation → stolen → invalidate **all** tokens for that user

**Cookie scoping** — set `Path=/v1/auth/refresh` so the refresh token cookie is only sent to that one endpoint, not on every API request.
