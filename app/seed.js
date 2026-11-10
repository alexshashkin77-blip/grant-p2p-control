/* Demo data for a fictional NGO, "Horizon Relief". All names are invented. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SEED = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    grants: [
      {
        id: 'G1', code: 'NBF26', name: 'Clean Water Programme', donor: 'Northbridge Foundation',
        entity: 'KE01', currency: 'USD', startDate: '2026-01-01', endDate: '2026-12-31',
        eligibleCategories: ['SUPPLIES', 'TRAVEL', 'CONSULTANCY', 'STAFF'],
      },
      {
        id: 'G2', code: 'GHT26', name: 'Mobile Clinics', donor: 'Global Health Trust',
        entity: 'KE01', currency: 'USD', startDate: '2026-04-01', endDate: '2027-03-31',
        eligibleCategories: ['SUPPLIES', 'EQUIPMENT', 'STAFF'],
      },
    ],
    budgetLines: [
      { id: 'L1', grantId: 'G1', code: '1.1', description: 'Water filters and pipes', category: 'SUPPLIES', budget: 40000 },
      { id: 'L2', grantId: 'G1', code: '1.2', description: 'Field travel', category: 'TRAVEL', budget: 8000 },
      { id: 'L3', grantId: 'G1', code: '2.1', description: 'Hydrology study', category: 'CONSULTANCY', budget: 15000 },
      { id: 'L4', grantId: 'G2', code: '1.1', description: 'Medical supplies', category: 'SUPPLIES', budget: 30000 },
      { id: 'L5', grantId: 'G2', code: '1.2', description: 'Clinic equipment', category: 'EQUIPMENT', budget: 50000 },
      // Deliberately ineligible: TRAVEL is not in GHT26's eligible categories.
      { id: 'L6', grantId: 'G2', code: '1.3', description: 'Staff travel (not donor-eligible)', category: 'TRAVEL', budget: 5000 },
    ],
    costCentres: [
      { code: 'NBO', name: 'Nairobi office' },
      { code: 'TRK', name: 'Turkana field base' },
    ],
    requests: [
      { id: 'PR-1001', description: 'Ceramic water filters (200 pcs)', budgetLineId: 'L1', costCentre: 'TRK', amount: 6400, quotes: 3, date: '2026-10-05', status: 'DRAFT', actualAmount: 0, approvals: [] },
      { id: 'PR-1002', description: 'Field visit Turkana, October', budgetLineId: 'L2', costCentre: 'TRK', amount: 1200, quotes: 1, date: '2026-10-12', status: 'DRAFT', actualAmount: 0, approvals: [] },
      { id: 'PR-1003', description: 'Portable ultrasound unit', budgetLineId: 'L5', costCentre: 'NBO', amount: 18500, quotes: 3, date: '2026-11-02', status: 'DRAFT', actualAmount: 0, approvals: [] },
    ],
    journals: [],
  };
});

/**
 * Builds the demo state by running real transactions through the engine,
 * so every status in the demo has matching journals.
 */
function buildDemo(Engine, seed) {
  let d = JSON.parse(JSON.stringify(seed));
  // PR-1001: full cycle to PAID
  d = Engine.submit(d, 'PR-1001');
  d = Engine.approve(d, 'PR-1001', 'Budget Holder', '2026-10-06');
  d = Engine.approve(d, 'PR-1001', 'Finance Manager', '2026-10-07');
  d = Engine.receive(d, 'PR-1001', 6400, '2026-10-20');
  d = Engine.invoice(d, 'PR-1001', '2026-10-22');
  d = Engine.pay(d, 'PR-1001', '2026-10-30');
  // PR-1002: approved, waiting for delivery (open commitment)
  d = Engine.submit(d, 'PR-1002');
  d = Engine.approve(d, 'PR-1002', 'Budget Holder', '2026-10-13');
  d = Engine.approve(d, 'PR-1002', 'Finance Manager', '2026-10-14');
  // PR-1003 stays DRAFT
  return d;
}
if (typeof module === 'object' && module.exports) module.exports.buildDemo = buildDemo;
else self.buildDemo = buildDemo;
