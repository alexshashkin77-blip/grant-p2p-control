// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../app/engine.js');
const SEED = require('../app/seed.js');

const fresh = () => JSON.parse(JSON.stringify(SEED));
const demo = () => SEED.buildDemo(Engine, SEED);

function addDraft(d, overrides) {
  const req = Object.assign(
    { id: 'PR-T', description: 'Test item', budgetLineId: 'L1', costCentre: 'NBO', amount: 500, quotes: 1, date: '2026-11-01', status: 'DRAFT', actualAmount: 0, approvals: [] },
    overrides
  );
  d.requests.push(req);
  return req;
}

test('approval chain grows with amount', () => {
  const d = fresh();
  assert.deepEqual(Engine.approvalChain(d, { budgetLineId: 'L1', amount: 500 }), ['Budget Holder']);
  assert.deepEqual(Engine.approvalChain(d, { budgetLineId: 'L1', amount: 2000 }), ['Budget Holder', 'Finance Manager']);
  assert.deepEqual(Engine.approvalChain(d, { budgetLineId: 'L5', amount: 12000 }), ['Budget Holder', 'Finance Manager', 'Country Director']);
});

test('Grant Manager is added when budget line goes above 90% utilisation', () => {
  const d = fresh();
  const chain = Engine.approvalChain(d, { budgetLineId: 'L2', amount: 7500 }); // 7,500 of 8,000
  assert.deepEqual(chain, ['Budget Holder', 'Grant Manager', 'Finance Manager']);
});

test('ineligible cost category is blocked', () => {
  const d = fresh();
  const req = addDraft(d, { budgetLineId: 'L6', amount: 300, date: '2026-06-01' });
  const { errors } = Engine.validateRequest(d, req);
  assert.ok(errors.some((e) => e.includes('not eligible')));
});

test('date outside grant period is blocked', () => {
  const d = fresh();
  const req = addDraft(d, { budgetLineId: 'L4', date: '2026-02-15' }); // GHT26 starts 2026-04-01
  assert.ok(Engine.validateRequest(d, req).errors.some((e) => e.includes('outside the grant period')));
});

test('insufficient funds is blocked, including open commitments', () => {
  const d = demo(); // PR-1002 holds 1,200 committed on L2 (budget 8,000)
  const req = addDraft(d, { budgetLineId: 'L2', amount: 7000, quotes: 3 });
  const { errors } = Engine.validateRequest(d, req);
  assert.ok(errors.some((e) => e.includes('Insufficient funds')));
});

test('procurement rule requires three quotes above 2,500', () => {
  const d = fresh();
  const req = addDraft(d, { amount: 3000, quotes: 1 });
  assert.ok(Engine.validateRequest(d, req).errors.some((e) => e.includes('3 quote')));
  req.quotes = 3;
  assert.equal(Engine.validateRequest(d, req).errors.length, 0);
});

test('approvals must follow the chain order', () => {
  let d = fresh();
  addDraft(d, { amount: 2000 });
  d = Engine.submit(d, 'PR-T');
  assert.throws(() => Engine.approve(d, 'PR-T', 'Finance Manager', '2026-11-02'), /Next approver is Budget Holder/);
});

test('final approval creates a balanced encumbrance journal', () => {
  let d = fresh();
  addDraft(d, { amount: 800 });
  d = Engine.submit(d, 'PR-T');
  d = Engine.approve(d, 'PR-T', 'Budget Holder', '2026-11-02');
  const j = d.journals.find((x) => x.requestId === 'PR-T');
  assert.equal(j.journalType, 'Encumbrance');
  assert.ok(Engine.isBalanced(j));
  assert.equal(Engine.fundsPosition(d, 'L1').committed, 800);
});

test('account derivation builds ENTITY-ACCOUNT-FUND-LINE-COSTCENTRE', () => {
  const d = fresh();
  const req = { budgetLineId: 'L1', costCentre: 'TRK' };
  assert.equal(Engine.deriveAccount(d, req, 'EXPENSE'), 'KE01-6100-NBF26-1.1-TRK');
  assert.equal(Engine.deriveAccount(d, req, 'LIABILITY'), 'KE01-2100-NBF26-000-TRK');
});

test('receipt books expense, relieves the commitment and respects tolerance', () => {
  let d = demo();
  assert.throws(() => Engine.receive(d, 'PR-1002', 1400, '2026-11-05'), /more than 10%/);
  d = Engine.receive(d, 'PR-1002', 1250, '2026-11-05');
  const pos = Engine.fundsPosition(d, 'L2');
  assert.equal(pos.committed, 0);
  assert.equal(pos.actual, 1250);
  const js = d.journals.filter((j) => j.requestId === 'PR-1002');
  assert.ok(js.every(Engine.isBalanced));
  assert.ok(js.some((j) => j.event === 'RECEIVE (encumbrance relief)'));
});

test('full demo cycle: every journal is balanced, accrual and liability clear to zero', () => {
  const d = demo();
  assert.ok(d.journals.every(Engine.isBalanced));
  const net = (acct) =>
    d.journals
      .filter((j) => j.requestId === 'PR-1001')
      .flatMap((j) => j.lines)
      .filter((l) => l.account.split('-')[1] === acct)
      .reduce((s, l) => s + (l.side === 'Dr' ? l.amount : -l.amount), 0);
  assert.equal(net('2150'), 0); // receipt accrual cleared by invoice
  assert.equal(net('2100'), 0); // liability cleared by payment
  assert.equal(net('9100') + net('9900'), 0); // encumbrance fully relieved
});

test('rejection requires a reason and frees the funds', () => {
  let d = fresh();
  addDraft(d, { amount: 900 });
  d = Engine.submit(d, 'PR-T');
  assert.equal(Engine.fundsPosition(d, 'L1').pending, 900);
  assert.throws(() => Engine.reject(d, 'PR-T', 'Budget Holder', '', '2026-11-02'), /reason/);
  d = Engine.reject(d, 'PR-T', 'Budget Holder', 'Duplicate request', '2026-11-02');
  assert.equal(Engine.fundsPosition(d, 'L1').pending, 0);
});
