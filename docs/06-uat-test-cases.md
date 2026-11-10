# 6. UAT test cases

Run on the prototype (`app/index.html`). Press **Reset demo** before starting. Use "Acting as" to switch approver.

| # | Story | Steps | Expected result |
|---|---|---|---|
| UAT-01 | US-01 | New request: "Hygiene kits", GHT26 1.1, 800, today, 1 quote → Save and submit | Status SUBMITTED, chain "Budget Holder" |
| UAT-02 | US-02 | GHT26 1.3 (staff travel), 100 → submit | Blocked: "TRAVEL is not eligible under grant GHT26" |
| UAT-03 | US-03 | GHT26 1.1, date 2026-02-15 → submit | Blocked: outside grant period 2026-04-01 to 2027-03-31 |
| UAT-04 | US-04 | NBF26 1.2 (field travel), 7,000, 3 quotes → submit | Blocked: available 6,800 (1,200 is committed by PR-1002) |
| UAT-05 | US-05 | NBF26 1.1, 3,000, 1 quote → submit | Blocked: three quotes required. Change to 3 quotes → submitted |
| UAT-06 | US-05 | GHT26 1.2, 30,000, 3 quotes, no tender ref → submit | Blocked: tender reference required |
| UAT-07 | US-06 | NBF26 1.2, 6,500, 3 quotes → submit | Warning about >90% use; chain Budget Holder → Grant Manager → Finance Manager |
| UAT-08 | US-06 | On UAT-07 request, act as Finance Manager → Approve | Error: next approver is Budget Holder |
| UAT-09 | US-06 | Reject a submitted request without reason, then with "Duplicate" | First blocked; then REJECTED, funds back in "available" |
| UAT-10 | US-07 | Submit PR-1003 (18,500), approve as Budget Holder, Finance Manager, Country Director | APPROVED; Encumbrance journal 18,500 on KE01-9100-GHT26-1.2-NBO; budget view committed 18,500 |
| UAT-11 | US-08 | PR-1002 → Record receipt 1,400 | Blocked: more than 10% over approved 1,200 |
| UAT-12 | US-08 | PR-1002 → Record receipt 1,250 | RECEIVED; Dr 6200 / Cr 2150 1,250; encumbrance relief 1,200; actual 1,250, committed 0 |
| UAT-13 | US-09 | PR-1002 → Match invoice → Pay | INVOICED then PAID; journals 2150→2100 and 2100→1150 |
| UAT-14 | US-10 | Accounting tab: check any journal | Balanced; account pattern Entity-Account-Fund-Line-CC; balance-sheet lines have line 000 |
| UAT-15 | US-11 | Budget tab | Totals per grant add up; GHT26 1.3 flagged "ineligible" |

Automated equivalents: `npm test` (12 tests).
