# 2. User stories and acceptance criteria

Each story maps to automated tests in [`tests/engine.test.js`](../tests/engine.test.js) and to the UAT cases in
[06-uat-test-cases.md](06-uat-test-cases.md).

---

### US-01 Raise a purchase request against a grant
**As a** budget holder **I want to** raise a purchase request on a grant budget line **so that** spending is
approved and charged to the right donor before money is committed.

Acceptance criteria
- Given a budget line, cost centre, amount and date, when I submit, the request gets status **SUBMITTED** and an approval chain.
- Description and an amount greater than zero are mandatory.
- The available funds of the selected line are shown before I submit.

### US-02 Block ineligible costs
**As a** grant manager **I want** costs in categories the donor does not fund to be blocked **so that** we don't
find ineligible costs at audit.

Acceptance criteria
- Given a budget line whose cost category is not eligible for the grant, when I submit, the request is rejected with a clear message naming the category and the grant.

### US-03 Block costs outside the grant period
Acceptance criteria
- Given a request date before the grant start or after the grant end, submission is blocked and the message shows the grant period.

### US-04 Check funds available
**As a** finance manager **I want** a request to be blocked when the budget line has no funds left **so that**
lines are never overspent without a budget revision.

Acceptance criteria
- Available = budget − pending − committed − actual.
- Pending requests (submitted, not approved) already reduce availability, so two people cannot spend the same money.
- When the amount is above the available amount, submission is blocked and the message shows both figures.

### US-05 Apply donor procurement rules
Acceptance criteria
- Below 2,500: one quote. From 2,500: three quotes. From 25,000: open tender reference required.
- Submission is blocked when the requirement is not met.

### US-06 Route for approval by amount
Acceptance criteria
- Budget Holder always approves; Finance Manager from 1,000; Country Director from 10,000.
- If the request takes the budget line above 90% use, Grant Manager is added after the Budget Holder, and the user sees a warning.
- Approvals happen in order; an approver out of turn gets "Next approver is …".
- A rejection needs a reason; the request becomes **REJECTED** and its funds are released.

### US-07 Commit funds on approval
**As a** finance manager **I want** an approved request to reserve the budget **so that** budget reports show real
spending commitments, not only paid invoices.

Acceptance criteria
- On final approval an **Encumbrance** journal is created (Dr Encumbrance / Cr Encumbrance Reserve) for the approved amount.
- The amount moves from *pending* to *committed* in the budget view.

### US-08 Record receipt and recognise the expense
Acceptance criteria
- Only approved requests can be received.
- The received amount may exceed the approved amount by at most 10%.
- On receipt: Dr Expense / Cr Receipt Accrual for the received amount, and the encumbrance is reversed for the approved amount.
- In the budget view the amount moves from *committed* to *actual*.

### US-09 Match invoice and pay
Acceptance criteria
- Invoice only after receipt: Dr Receipt Accrual / Cr Supplier Liability.
- Payment only after invoice: Dr Supplier Liability / Cr Cash Clearing.
- After the full cycle the accrual and liability accounts for the request net to zero.

### US-10 Charge the right accounts automatically
**As an** accountant **I want** the account to be derived from the grant, budget line and cost centre **so that**
users never type account codes and the ledger always agrees with the donor report.

Acceptance criteria
- Account format: `ENTITY-ACCOUNT-FUND-BUDGETLINE-COSTCENTRE`.
- Expense account comes from the cost-category mapping; other accounts are fixed per accounting class.
- Fund = grant code on every line; budget line is filled on expense/encumbrance lines and `000` on balance-sheet lines.
- Every journal balances.

### US-11 Donor report: budget vs actuals
Acceptance criteria
- Per grant and budget line: budget, actual, committed, pending, available and a use bar.
- Lines with a non-eligible category are flagged.
