# 5. Accounting rules

The prototype uses the same three-layer pattern as an ERP subledger accounting engine
(for example Oracle Fusion Subledger Accounting):

1. **Accounting event** — something happens to the document (approve, receive, invoice, pay).
2. **Journal line rules** — for that event, which lines to create, debit or credit, and the *accounting class* of each line.
3. **Account derivation** — for each accounting class, how each segment of the account is filled.

Keeping the three layers apart means a new requirement (for example "travel goes to a different account for one
donor") is a change to one mapping row, not to the code of the workflow.

## Layer 2 — journal line rules

| Event | Journal type | Debit | Credit | Amount |
|---|---|---|---|---|
| APPROVE | Encumbrance | ENCUMBRANCE | ENCUMBRANCE_RESERVE | approved |
| RECEIVE | Actual | EXPENSE | RECEIPT_ACCRUAL | received |
| RECEIVE (relief) | Encumbrance | ENCUMBRANCE_RESERVE | ENCUMBRANCE | approved |
| INVOICE | Actual | RECEIPT_ACCRUAL | LIABILITY | received |
| PAY | Actual | LIABILITY | CASH_CLEARING | received |

This is **accrue at receipt**: the expense is recognised when goods or services are received, so the donor report
shows the cost in the right period even if the supplier invoices late.

## Layer 3 — account derivation

Account format: `ENTITY-ACCOUNT-FUND-BUDGETLINE-COSTCENTRE`, e.g. `KE01-6100-NBF26-1.1-TRK`.

| Segment | Rule |
|---|---|
| ENTITY | From the grant (the legal entity / country office that signed it) |
| ACCOUNT | EXPENSE: mapping set by cost category (below). Other classes: constant per class (below) |
| FUND | Grant code, on every line |
| BUDGETLINE | Budget line code on EXPENSE and ENCUMBRANCE lines; `000` otherwise |
| COSTCENTRE | From the request |

Mapping set — cost category → expense account

| Category | Account |
|---|---|
| SUPPLIES | 6100 |
| TRAVEL | 6200 |
| CONSULTANCY | 6300 |
| EQUIPMENT | 6400 |
| STAFF | 6500 |

Constant accounts per accounting class

| Accounting class | Account | Type |
|---|---|---|
| ENCUMBRANCE | 9100 | Budgetary (memo) |
| ENCUMBRANCE_RESERVE | 9900 | Budgetary (memo) |
| RECEIPT_ACCRUAL | 2150 | Liability — received not invoiced |
| LIABILITY | 2100 | Liability — suppliers |
| CASH_CLEARING | 1150 | Asset — cleared by bank reconciliation |

## Worked example — PR-1001, water filters, 6,400

| Event | Account | Dr | Cr |
|---|---|---|---|
| APPROVE | KE01-9100-NBF26-1.1-TRK | 6,400 | |
| | KE01-9900-NBF26-000-TRK | | 6,400 |
| RECEIVE | KE01-6100-NBF26-1.1-TRK | 6,400 | |
| | KE01-2150-NBF26-000-TRK | | 6,400 |
| RECEIVE (relief) | KE01-9900-NBF26-000-TRK | 6,400 | |
| | KE01-9100-NBF26-1.1-TRK | | 6,400 |
| INVOICE | KE01-2150-NBF26-000-TRK | 6,400 | |
| | KE01-2100-NBF26-000-TRK | | 6,400 |
| PAY | KE01-2100-NBF26-000-TRK | 6,400 | |
| | KE01-1150-NBF26-000-TRK | | 6,400 |

End result: expense 6,400 on grant NBF26, line 1.1; encumbrance, accrual and liability all back to zero;
cash clearing waits for the bank statement.

## Points to confirm with a real client

- Accrue at receipt (as here) or accrue at period end only.
- Whether budgetary control should **block** (as here) or only **warn** for some donors.
- Over-receipt tolerance per donor or per category.
- Whether the fund segment is kept on cash and bank accounts, or cash is pooled and allocated monthly.
