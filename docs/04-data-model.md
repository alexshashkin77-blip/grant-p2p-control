# 4. Data model

Full DDL: [`sql/schema.sql`](../sql/schema.sql). Demo data: [`sql/seed.sql`](../sql/seed.sql).

```mermaid
erDiagram
    DONOR ||--o{ GRANT_AWARD : funds
    GRANT_AWARD ||--o{ BUDGET_LINE : "is split into"
    GRANT_AWARD ||--o{ GRANT_ELIGIBLE_CATEGORY : allows
    COST_CATEGORY ||--o{ GRANT_ELIGIBLE_CATEGORY : ""
    COST_CATEGORY ||--o{ BUDGET_LINE : classifies
    BUDGET_LINE ||--o{ PURCHASE_REQUEST : "is charged by"
    COST_CENTRE ||--o{ PURCHASE_REQUEST : ""
    PURCHASE_REQUEST ||--o{ REQUEST_APPROVAL : "routed through"
    PURCHASE_REQUEST ||--o{ JOURNAL_HEADER : "accounted by"
    JOURNAL_HEADER ||--|{ JOURNAL_LINE : contains

    GRANT_AWARD { text grant_code "FUND segment" date start_date date end_date text entity_code }
    BUDGET_LINE { text line_code "BUDGETLINE segment" text category_code numeric budget_amount }
    COST_CATEGORY { text category_code text expense_account "mapping set" }
    PURCHASE_REQUEST { text request_id numeric amount numeric actual_amount text status }
    JOURNAL_LINE { text accounting_class text account text fund text budget_line numeric debit numeric credit }
```

## Design notes

- **Grant code = fund segment.** Every journal line carries the grant, including balance-sheet lines. This is fund
  accounting: a balance sheet per grant can be produced, and grant reports come straight from the ledger.
- **Budget line as its own segment**, filled only on expense and encumbrance lines. Balance-sheet lines use `000`
  so accruals and liabilities are not split into meaningless pieces.
- **Eligibility is data, not code.** `grant_eligible_category` is maintained by the grant team per agreement;
  no developer is needed when a new grant is signed.
- **Status on the request plus journals as the audit trail.** Budget figures can be rebuilt either from request
  status (operational view) or from journals (accounting view); report 6 in `reports.sql` checks they agree.
