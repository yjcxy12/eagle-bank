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
