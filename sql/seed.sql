-- Demo data: same setup as app/seed.js, plus two extra requests (PR-1004, PR-1005)
-- so that every control report in reports.sql returns at least one row.
INSERT INTO donor VALUES (1, 'Northbridge Foundation'), (2, 'Global Health Trust');

INSERT INTO grant_award VALUES
 (1, 'NBF26', 'Clean Water Programme', 1, 'KE01', 'USD', '2026-01-01', '2026-12-31'),
 (2, 'GHT26', 'Mobile Clinics',        2, 'KE01', 'USD', '2026-04-01', '2027-03-31');

INSERT INTO cost_category VALUES
 ('SUPPLIES','6100'), ('TRAVEL','6200'), ('CONSULTANCY','6300'), ('EQUIPMENT','6400'), ('STAFF','6500');

INSERT INTO grant_eligible_category VALUES
 (1,'SUPPLIES'), (1,'TRAVEL'), (1,'CONSULTANCY'), (1,'STAFF'),
 (2,'SUPPLIES'), (2,'EQUIPMENT'), (2,'STAFF');

INSERT INTO budget_line VALUES
 (1, 1, '1.1', 'Water filters and pipes', 'SUPPLIES', 40000),
 (2, 1, '1.2', 'Field travel', 'TRAVEL', 8000),
 (3, 1, '2.1', 'Hydrology study', 'CONSULTANCY', 15000),
 (4, 2, '1.1', 'Medical supplies', 'SUPPLIES', 30000),
 (5, 2, '1.2', 'Clinic equipment', 'EQUIPMENT', 50000),
 (6, 2, '1.3', 'Staff travel (not donor-eligible)', 'TRAVEL', 5000);

INSERT INTO cost_centre VALUES ('NBO','Nairobi office'), ('TRK','Turkana field base');

INSERT INTO approval_level VALUES (1,'Budget Holder',0), (2,'Finance Manager',1000), (3,'Country Director',10000);

INSERT INTO purchase_request VALUES
 ('PR-1001','Ceramic water filters (200 pcs)', 1, 'TRK', '2026-10-05', 6400, 6400, 3, 'PAID'),
 ('PR-1002','Field visit Turkana, October',    2, 'TRK', '2026-10-12', 1200,    0, 1, 'APPROVED'),
 ('PR-1003','Portable ultrasound unit',        5, 'NBO', '2026-11-02',18500,    0, 3, 'DRAFT'),
 -- an exception for the control reports: travel booked on a line the donor does not fund
 ('PR-1004','Taxi to airport',                 6, 'NBO', '2026-11-03',  150,  150, 1, 'RECEIVED'),
 ('PR-1005','Hygiene kits',                    4, 'TRK', '2026-11-04', 3200,    0, 3, 'SUBMITTED');

INSERT INTO request_approval VALUES
 ('PR-1001',1,'Budget Holder','APPROVED','2026-10-06',NULL),
 ('PR-1001',2,'Finance Manager','APPROVED','2026-10-07',NULL),
 ('PR-1002',1,'Budget Holder','APPROVED','2026-10-13',NULL),
 ('PR-1002',2,'Finance Manager','APPROVED','2026-10-14',NULL),
 ('PR-1004',1,'Budget Holder','APPROVED','2026-11-03',NULL),
 ('PR-1005',1,'Budget Holder','APPROVED','2026-11-05',NULL),
 ('PR-1005',2,'Finance Manager','PENDING',NULL,NULL);

INSERT INTO journal_header VALUES
 (1,'PR-1001','APPROVE','Encumbrance','2026-10-07'),
 (2,'PR-1001','RECEIVE','Actual','2026-10-20'),
 (3,'PR-1001','RECEIVE (encumbrance relief)','Encumbrance','2026-10-20'),
 (4,'PR-1001','INVOICE','Actual','2026-10-22'),
 (5,'PR-1001','PAY','Actual','2026-10-30'),
 (6,'PR-1002','APPROVE','Encumbrance','2026-10-14'),
 (7,'PR-1004','RECEIVE','Actual','2026-11-03');

INSERT INTO journal_line VALUES
 (1,1,'ENCUMBRANCE',        'KE01','9100','NBF26','1.1','TRK',6400,0),
 (1,2,'ENCUMBRANCE_RESERVE','KE01','9900','NBF26','000','TRK',0,6400),
 (2,1,'EXPENSE',            'KE01','6100','NBF26','1.1','TRK',6400,0),
 (2,2,'RECEIPT_ACCRUAL',    'KE01','2150','NBF26','000','TRK',0,6400),
 (3,1,'ENCUMBRANCE_RESERVE','KE01','9900','NBF26','000','TRK',6400,0),
 (3,2,'ENCUMBRANCE',        'KE01','9100','NBF26','1.1','TRK',0,6400),
 (4,1,'RECEIPT_ACCRUAL',    'KE01','2150','NBF26','000','TRK',6400,0),
 (4,2,'LIABILITY',          'KE01','2100','NBF26','000','TRK',0,6400),
 (5,1,'LIABILITY',          'KE01','2100','NBF26','000','TRK',6400,0),
 (5,2,'CASH_CLEARING',      'KE01','1150','NBF26','000','TRK',0,6400),
 (6,1,'ENCUMBRANCE',        'KE01','9100','NBF26','1.2','TRK',1200,0),
 (6,2,'ENCUMBRANCE_RESERVE','KE01','9900','NBF26','000','TRK',0,1200),
 (7,1,'EXPENSE',            'KE01','6200','GHT26','1.3','NBO',150,0),
 (7,2,'RECEIPT_ACCRUAL',    'KE01','2150','GHT26','000','NBO',0,150);
