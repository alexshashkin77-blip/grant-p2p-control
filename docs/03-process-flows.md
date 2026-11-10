# 3. Process flows

## Purchase request lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> SUBMITTED: submit (all checks pass)
    SUBMITTED --> SUBMITTED: approve (more approvers left)
    SUBMITTED --> APPROVED: final approval / encumbrance journal
    SUBMITTED --> REJECTED: reject with reason
    APPROVED --> RECEIVED: receipt / expense + accrual, encumbrance relieved
    RECEIVED --> INVOICED: invoice matched / accrual to liability
    INVOICED --> PAID: payment / liability to cash clearing
    PAID --> [*]
    REJECTED --> [*]
```

## Submission checks

```mermaid
flowchart TD
    A[Submit request] --> B{Date inside grant period?}
    B -- no --> X[Block: outside grant period]
    B -- yes --> C{Cost category eligible for this donor?}
    C -- no --> Y[Block: ineligible cost]
    C -- yes --> D{Amount <= available on budget line?}
    D -- no --> Z[Block: insufficient funds]
    D -- yes --> E{Quotes / tender meet procurement rule?}
    E -- no --> W[Block: procurement rule]
    E -- yes --> F[Build approval chain]
    F --> G{Line use after request > 90%?}
    G -- yes --> H[Add Grant Manager + warning]
    G -- no --> I[Status SUBMITTED]
    H --> I
```

## Approval chain

| Amount | Approvers (in order) |
|---|---|
| < 1,000 | Budget Holder |
| 1,000 – 9,999 | Budget Holder → Finance Manager |
| ≥ 10,000 | Budget Holder → Finance Manager → Country Director |
| any, line > 90% used | Grant Manager inserted after Budget Holder |

## Money view along the process

| Step | Budget view | Ledger |
|---|---|---|
| Submitted | pending ↑ | — |
| Approved | pending ↓, committed ↑ | Encumbrance journal |
| Received | committed ↓, actual ↑ | Expense / accrual + encumbrance relief |
| Invoiced | — | Accrual → supplier liability |
| Paid | — | Liability → cash clearing (cleared later by bank reconciliation) |
