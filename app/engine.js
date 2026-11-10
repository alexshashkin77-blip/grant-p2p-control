/*
 * Grant P2P Control — business-rule engine
 * -----------------------------------------
 * Pure functions, no UI. Runs in the browser (window.Engine) and in Node (module.exports),
 * so the same rules are unit-tested and used by the prototype screen.
 *
 * Lifecycle of a purchase request:
 *   DRAFT -> SUBMITTED -> (approval steps) -> APPROVED -> RECEIVED -> INVOICED -> PAID
 *                      \-> REJECTED
 *
 * Accounting follows an ERP subledger pattern (event -> journal line rules -> account derivation),
 * simplified from Oracle Fusion Subledger Accounting (SLA) best practice.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration (in a real system these are setup tables, see sql/schema.sql)
  // ---------------------------------------------------------------------------

  /** Approval chain by amount. Every level whose threshold is reached must approve, in order. */
  const APPROVAL_LEVELS = [
    { role: 'Budget Holder', minAmount: 0 },
    { role: 'Finance Manager', minAmount: 1000 },
    { role: 'Country Director', minAmount: 10000 },
  ];

  /** Grant Manager joins the chain when a request pushes a budget line above this utilisation. */
  const GRANT_MANAGER_UTILISATION = 0.9;

  /** Donor procurement rule: number of quotes required by amount. */
  const PROCUREMENT_THRESHOLDS = [
    { minAmount: 0, quotes: 1, method: 'Single quote' },
    { minAmount: 2500, quotes: 3, method: 'Three quotes' },
    { minAmount: 25000, quotes: 0, method: 'Open tender' },
  ];

  /** Allowed over-receipt versus the approved amount. */
  const RECEIPT_TOLERANCE = 0.1;

  /** Mapping set: cost category -> natural account (expense side). */
  const EXPENSE_ACCOUNT_BY_CATEGORY = {
    SUPPLIES: '6100',
    TRAVEL: '6200',
    CONSULTANCY: '6300',
    EQUIPMENT: '6400',
    STAFF: '6500',
  };

  /** Fixed natural accounts per accounting class (setup-level defaults). */
  const ACCOUNT_BY_CLASS = {
    ENCUMBRANCE: '9100',
    ENCUMBRANCE_RESERVE: '9900',
    RECEIPT_ACCRUAL: '2150',
    LIABILITY: '2100',
    CASH_CLEARING: '1150',
  };

  /**
   * Journal line rules per accounting event: which lines to create, Dr or Cr, which accounting class.
   * Mirrors the SLA "Journal Line Rule" layer.
   */
  const JOURNAL_LINE_RULES = {
    APPROVE: {
      journalType: 'Encumbrance',
      lines: [
        { side: 'Dr', accountingClass: 'ENCUMBRANCE' },
        { side: 'Cr', accountingClass: 'ENCUMBRANCE_RESERVE' },
      ],
    },
    RECEIVE: {
      journalType: 'Actual',
      lines: [
        { side: 'Dr', accountingClass: 'EXPENSE' },
        { side: 'Cr', accountingClass: 'RECEIPT_ACCRUAL' },
      ],
      relieveEncumbrance: true,
    },
    INVOICE: {
      journalType: 'Actual',
      lines: [
        { side: 'Dr', accountingClass: 'RECEIPT_ACCRUAL' },
        { side: 'Cr', accountingClass: 'LIABILITY' },
      ],
    },
    PAY: {
      journalType: 'Actual',
      lines: [
        { side: 'Dr', accountingClass: 'LIABILITY' },
        { side: 'Cr', accountingClass: 'CASH_CLEARING' },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const round2 = (n) => Math.round(n * 100) / 100;
  const byId = (list, id) => list.find((x) => x.id === id);

  function lineOf(data, req) {
    const line = byId(data.budgetLines, req.budgetLineId);
    if (!line) throw new Error('Unknown budget line ' + req.budgetLineId);
    return line;
  }
  function grantOf(data, line) {
    const grant = byId(data.grants, line.grantId);
    if (!grant) throw new Error('Unknown grant ' + line.grantId);
    return grant;
  }

  // ---------------------------------------------------------------------------
  // Budget control
  // ---------------------------------------------------------------------------

  /**
   * Funds position of a budget line.
   *  pending   = submitted, not yet approved (soft reservation)
   *  committed = approved, not yet received (encumbrance)
   *  actual    = received (expense recognised)
   */
  function fundsPosition(data, budgetLineId, excludeRequestId) {
    const line = byId(data.budgetLines, budgetLineId);
    let pending = 0, committed = 0, actual = 0;
    for (const r of data.requests) {
      if (r.budgetLineId !== budgetLineId || r.id === excludeRequestId) continue;
      if (r.status === 'SUBMITTED') pending += r.amount;
      else if (r.status === 'APPROVED') committed += r.amount;
      else if (['RECEIVED', 'INVOICED', 'PAID'].includes(r.status)) actual += r.actualAmount;
    }
    const budget = line ? line.budget : 0;
    const consumed = pending + committed + actual;
    return {
      budget,
      pending: round2(pending),
      committed: round2(committed),
      actual: round2(actual),
      available: round2(budget - consumed),
      utilisation: budget ? consumed / budget : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation and routing
  // ---------------------------------------------------------------------------

  /** Returns { errors: [], warnings: [] }. Errors block submission. */
  function validateRequest(data, req) {
    const errors = [];
    const warnings = [];
    const line = byId(data.budgetLines, req.budgetLineId);
    if (!line) return { errors: ['Budget line is required.'], warnings };
    const grant = grantOf(data, line);

    if (!(req.amount > 0)) errors.push('Amount must be greater than zero.');
    if (!req.description || !req.description.trim()) errors.push('Description is required.');

    if (req.date < grant.startDate || req.date > grant.endDate)
      errors.push(`Date ${req.date} is outside the grant period (${grant.startDate} to ${grant.endDate}).`);

    if (!grant.eligibleCategories.includes(line.category))
      errors.push(`Cost category ${line.category} is not eligible under grant ${grant.code}.`);

    const pos = fundsPosition(data, line.id, req.id);
    if (req.amount > pos.available)
      errors.push(`Insufficient funds on budget line ${line.code}: available ${pos.available.toFixed(2)}, requested ${req.amount.toFixed(2)}.`);

    const proc = procurementRule(req.amount);
    if (proc.quotes > 0 && (req.quotes || 0) < proc.quotes)
      errors.push(`${proc.method} rule: ${proc.quotes} quote(s) required, ${req.quotes || 0} attached.`);
    if (proc.method === 'Open tender' && !req.tenderRef)
      errors.push('Open tender rule: a tender reference is required above 25,000.');

    if (pos.budget && (pos.budget - pos.available + req.amount) / pos.budget > GRANT_MANAGER_UTILISATION)
      warnings.push(`Budget line ${line.code} will be over ${GRANT_MANAGER_UTILISATION * 100}% used — Grant Manager approval added.`);

    return { errors, warnings };
  }

  function procurementRule(amount) {
    let rule = PROCUREMENT_THRESHOLDS[0];
    for (const t of PROCUREMENT_THRESHOLDS) if (amount >= t.minAmount) rule = t;
    return rule;
  }

  /** Ordered list of approver roles for a request. */
  function approvalChain(data, req) {
    const chain = APPROVAL_LEVELS.filter((l) => req.amount >= l.minAmount).map((l) => l.role);
    const pos = fundsPosition(data, req.budgetLineId, req.id);
    if (pos.budget && (pos.budget - pos.available + req.amount) / pos.budget > GRANT_MANAGER_UTILISATION)
      chain.splice(1, 0, 'Grant Manager');
    return chain;
  }

  // ---------------------------------------------------------------------------
  // Accounting: account derivation + journal creation
  // ---------------------------------------------------------------------------

  /**
   * Builds the account combination ENTITY-ACCOUNT-FUND-BUDGETLINE-COSTCENTRE.
   * Segment rules:
   *   ENTITY      <- grant.entity           (source)
   *   ACCOUNT     <- mapping set by category for EXPENSE, otherwise constant per accounting class
   *   FUND        <- grant.code             (kept on all lines: fund accounting)
   *   BUDGETLINE  <- budget line code on EXPENSE / ENCUMBRANCE lines, '000' on balance-sheet lines
   *   COSTCENTRE  <- request cost centre    (source)
   */
  function deriveAccount(data, req, accountingClass) {
    const line = lineOf(data, req);
    const grant = grantOf(data, line);
    let account;
    if (accountingClass === 'EXPENSE') {
      account = EXPENSE_ACCOUNT_BY_CATEGORY[line.category];
      if (!account) throw new Error('No expense account mapped for category ' + line.category);
    } else {
      account = ACCOUNT_BY_CLASS[accountingClass];
    }
    const usesBudgetLine = accountingClass === 'EXPENSE' || accountingClass === 'ENCUMBRANCE';
    return [grant.entity, account, grant.code, usesBudgetLine ? line.code : '000', req.costCentre || '000'].join('-');
  }

  function buildJournal(data, req, event, amount, date) {
    const rule = JOURNAL_LINE_RULES[event];
    const lines = rule.lines.map((l) => ({
      side: l.side,
      accountingClass: l.accountingClass,
      account: deriveAccount(data, req, l.accountingClass),
      amount: round2(amount),
    }));
    const journals = [{ requestId: req.id, event, journalType: rule.journalType, date, lines }];

    if (rule.relieveEncumbrance) {
      // Reverse the commitment for the approved amount.
      journals.push({
        requestId: req.id,
        event: event + ' (encumbrance relief)',
        journalType: 'Encumbrance',
        date,
        lines: [
          { side: 'Dr', accountingClass: 'ENCUMBRANCE_RESERVE', account: deriveAccount(data, req, 'ENCUMBRANCE_RESERVE'), amount: round2(req.amount) },
          { side: 'Cr', accountingClass: 'ENCUMBRANCE', account: deriveAccount(data, req, 'ENCUMBRANCE'), amount: round2(req.amount) },
        ],
      });
    }
    return journals;
  }

  function isBalanced(journal) {
    let dr = 0, cr = 0;
    for (const l of journal.lines) (l.side === 'Dr' ? (dr += l.amount) : (cr += l.amount));
    return round2(dr) === round2(cr);
  }

  // ---------------------------------------------------------------------------
  // Workflow transitions. Each returns a NEW data object (no mutation of the input).
  // ---------------------------------------------------------------------------

  function clone(data) { return JSON.parse(JSON.stringify(data)); }
  function fail(msg) { const e = new Error(msg); e.userError = true; throw e; }

  function submit(data, requestId) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'DRAFT') fail('Only draft requests can be submitted.');
    const { errors } = validateRequest(d, req);
    if (errors.length) fail(errors.join(' '));
    req.approvals = approvalChain(d, req).map((role) => ({ role, status: 'PENDING' }));
    req.status = 'SUBMITTED';
    return d;
  }

  function approve(data, requestId, role, date) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'SUBMITTED') fail('Request is not waiting for approval.');
    const next = req.approvals.find((a) => a.status === 'PENDING');
    if (next.role !== role) fail(`Next approver is ${next.role}, not ${role}.`);
    next.status = 'APPROVED';
    next.date = date;
    if (req.approvals.every((a) => a.status === 'APPROVED')) {
      req.status = 'APPROVED';
      d.journals.push(...buildJournal(d, req, 'APPROVE', req.amount, date));
    }
    return d;
  }

  function reject(data, requestId, role, reason, date) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'SUBMITTED') fail('Request is not waiting for approval.');
    const next = req.approvals.find((a) => a.status === 'PENDING');
    if (next.role !== role) fail(`Next approver is ${next.role}, not ${role}.`);
    if (!reason) fail('A rejection reason is required.');
    Object.assign(next, { status: 'REJECTED', date, reason });
    req.status = 'REJECTED';
    return d;
  }

  function receive(data, requestId, actualAmount, date) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'APPROVED') fail('Only approved requests can be received.');
    if (!(actualAmount > 0)) fail('Received amount must be greater than zero.');
    if (actualAmount > req.amount * (1 + RECEIPT_TOLERANCE))
      fail(`Received amount exceeds the approved amount by more than ${RECEIPT_TOLERANCE * 100}%.`);
    req.actualAmount = round2(actualAmount);
    req.status = 'RECEIVED';
    d.journals.push(...buildJournal(d, req, 'RECEIVE', actualAmount, date));
    return d;
  }

  function invoice(data, requestId, date) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'RECEIVED') fail('Invoice can only be matched to a received request.');
    req.status = 'INVOICED';
    d.journals.push(...buildJournal(d, req, 'INVOICE', req.actualAmount, date));
    return d;
  }

  function pay(data, requestId, date) {
    const d = clone(data);
    const req = byId(d.requests, requestId);
    if (req.status !== 'INVOICED') fail('Only invoiced requests can be paid.');
    req.status = 'PAID';
    d.journals.push(...buildJournal(d, req, 'PAY', req.actualAmount, date));
    return d;
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /** Budget vs actuals per budget line of a grant (the donor report view). */
  function grantReport(data, grantId) {
    return data.budgetLines
      .filter((l) => l.grantId === grantId)
      .map((l) => ({ line: l.code, description: l.description, category: l.category, ...fundsPosition(data, l.id) }));
  }

  return {
    config: { APPROVAL_LEVELS, GRANT_MANAGER_UTILISATION, PROCUREMENT_THRESHOLDS, RECEIPT_TOLERANCE, EXPENSE_ACCOUNT_BY_CATEGORY, ACCOUNT_BY_CLASS, JOURNAL_LINE_RULES },
    fundsPosition, validateRequest, procurementRule, approvalChain,
    deriveAccount, buildJournal, isBalanced,
    submit, approve, reject, receive, invoice, pay,
    grantReport,
  };
});
