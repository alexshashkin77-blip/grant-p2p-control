-- Grant P2P Control — reporting and control queries

-- 1. Donor report: budget vs actuals vs commitments per budget line
SELECT g.grant_code,
       bl.line_code,
       bl.description,
       bl.budget_amount                                                   AS budget,
       COALESCE(SUM(CASE WHEN pr.status IN ('RECEIVED','INVOICED','PAID') THEN pr.actual_amount END), 0) AS actual,
       COALESCE(SUM(CASE WHEN pr.status = 'APPROVED'  THEN pr.amount END), 0) AS committed,
       COALESCE(SUM(CASE WHEN pr.status = 'SUBMITTED' THEN pr.amount END), 0) AS pending,
       bl.budget_amount
         - COALESCE(SUM(CASE WHEN pr.status IN ('RECEIVED','INVOICED','PAID') THEN pr.actual_amount
                             WHEN pr.status IN ('APPROVED','SUBMITTED') THEN pr.amount END), 0) AS available,
       ROUND(100.0 * COALESCE(SUM(CASE WHEN pr.status IN ('RECEIVED','INVOICED','PAID') THEN pr.actual_amount END), 0)
             / bl.budget_amount, 1)                                       AS burn_pct
FROM budget_line bl
JOIN grant_award g        ON g.grant_id = bl.grant_id
LEFT JOIN purchase_request pr ON pr.budget_line_id = bl.budget_line_id
GROUP BY g.grant_code, bl.line_code, bl.description, bl.budget_amount
ORDER BY g.grant_code, bl.line_code;

-- 2. Control: spending on cost categories the donor does not fund
SELECT pr.request_id, g.grant_code, bl.line_code, bl.category_code, pr.actual_amount, pr.status
FROM purchase_request pr
JOIN budget_line bl ON bl.budget_line_id = pr.budget_line_id
JOIN grant_award g  ON g.grant_id = bl.grant_id
LEFT JOIN grant_eligible_category ec
       ON ec.grant_id = bl.grant_id AND ec.category_code = bl.category_code
WHERE ec.category_code IS NULL
  AND pr.status NOT IN ('DRAFT','REJECTED');

-- 3. Control: requests dated outside the grant period
SELECT pr.request_id, g.grant_code, pr.request_date, g.start_date, g.end_date
FROM purchase_request pr
JOIN budget_line bl ON bl.budget_line_id = pr.budget_line_id
JOIN grant_award g  ON g.grant_id = bl.grant_id
WHERE pr.request_date NOT BETWEEN g.start_date AND g.end_date;

-- 4. Control: every journal must balance
SELECT jh.journal_id, jh.request_id, jh.event_type, SUM(jl.debit) AS dr, SUM(jl.credit) AS cr
FROM journal_header jh
JOIN journal_line jl ON jl.journal_id = jh.journal_id
GROUP BY jh.journal_id, jh.request_id, jh.event_type
HAVING SUM(jl.debit) <> SUM(jl.credit);

-- 5. Month-end: receipt accrual balance by grant (received, not yet invoiced)
--    Should agree with the list of requests in status RECEIVED.
SELECT jl.fund AS grant_code, SUM(jl.credit - jl.debit) AS uninvoiced_receipts
FROM journal_line jl
JOIN journal_header jh ON jh.journal_id = jl.journal_id
WHERE jl.account = '2150' AND jh.accounting_date <= '2026-11-30'
GROUP BY jl.fund
HAVING SUM(jl.credit - jl.debit) <> 0;

-- 6. Reconciliation: open encumbrance in GL vs approved-not-received requests
SELECT e.fund, e.budget_line, e.gl_open_commitment, COALESCE(r.approved_not_received, 0) AS approved_not_received,
       e.gl_open_commitment - COALESCE(r.approved_not_received, 0) AS difference
FROM (SELECT fund, budget_line, SUM(debit - credit) AS gl_open_commitment
      FROM journal_line WHERE account = '9100' GROUP BY fund, budget_line) e
LEFT JOIN (SELECT g.grant_code AS fund, bl.line_code AS budget_line, SUM(pr.amount) AS approved_not_received
           FROM purchase_request pr
           JOIN budget_line bl ON bl.budget_line_id = pr.budget_line_id
           JOIN grant_award g  ON g.grant_id = bl.grant_id
           WHERE pr.status = 'APPROVED'
           GROUP BY g.grant_code, bl.line_code) r
  ON r.fund = e.fund AND r.budget_line = e.budget_line;

-- 7. Approval aging: requests still waiting, and for whom
SELECT pr.request_id, pr.amount, ra.role_name AS waiting_for, pr.request_date,
       CAST(julianday('2026-11-10') - julianday(pr.request_date) AS INTEGER) AS days_waiting  -- julianday: SQLite
FROM purchase_request pr
JOIN request_approval ra ON ra.request_id = pr.request_id AND ra.status = 'PENDING'
WHERE pr.status = 'SUBMITTED'
  AND ra.step = (SELECT MIN(step) FROM request_approval x WHERE x.request_id = pr.request_id AND x.status = 'PENDING');
