# 7. Month-end checklist (grant P2P)

Order matters: payables close first because they feed accruals and budget figures; the general ledger closes last.
Query numbers refer to [`sql/reports.sql`](../sql/reports.sql).

| # | Step | Owner | Check |
|---|---|---|---|
| 1 | Chase approvers on requests still waiting | Finance Manager | Query 7, approval aging |
| 2 | Make sure all goods/services received in the month are recorded | Budget holders | Receipts dated in the month |
| 3 | Match all received supplier invoices; resolve price differences | AP | No RECEIVED requests with an invoice in hand |
| 4 | Run payments; reconcile bank statements to clear cash clearing | Treasury | Cash clearing balance = payments not yet on statement |
| 5 | Review receipt accrual balance (received, not invoiced) | Accountant | Query 5 = list of RECEIVED requests |
| 6 | Reconcile open commitments: GL encumbrance vs approved, not received requests | Accountant | Query 6, difference = 0 |
| 7 | Check journals balance | Accountant | Query 4 returns no rows |
| 8 | Control review: ineligible categories and out-of-period dates | Grant Manager | Queries 2 and 3 return no rows (or are explained) |
| 9 | Close payables period | Finance Manager | — |
| 10 | Produce donor budget-vs-actual report and burn rate | Grant Manager | Query 1; investigate lines with low burn near grant end |
| 11 | Close the general ledger period | Finance Manager | — |

Lines with a high committed amount but low actuals close to the grant end date are the main risk: goods ordered
but not delivered before the end date are usually not eligible.
