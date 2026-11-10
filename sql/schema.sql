-- Grant P2P Control — reference data model (ANSI SQL, tested on SQLite)
-- Mirrors the prototype's engine. In an ERP these would be setup + transaction tables.

-- ---------- Setup ----------
CREATE TABLE donor (
  donor_id      INTEGER PRIMARY KEY,
  name          TEXT NOT NULL
);

CREATE TABLE grant_award (
  grant_id      INTEGER PRIMARY KEY,
  grant_code    TEXT NOT NULL UNIQUE,         -- also the FUND segment of the account
  name          TEXT NOT NULL,
  donor_id      INTEGER NOT NULL REFERENCES donor(donor_id),
  entity_code   TEXT NOT NULL,                -- ENTITY segment
  currency      TEXT NOT NULL DEFAULT 'USD',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  CHECK (end_date >= start_date)
);

CREATE TABLE cost_category (
  category_code   TEXT PRIMARY KEY,           -- SUPPLIES, TRAVEL, ...
  expense_account TEXT NOT NULL               -- mapping set: category -> natural account
);

-- Which cost categories each donor allows on a grant
CREATE TABLE grant_eligible_category (
  grant_id      INTEGER REFERENCES grant_award(grant_id),
  category_code TEXT REFERENCES cost_category(category_code),
  PRIMARY KEY (grant_id, category_code)
);

CREATE TABLE budget_line (
  budget_line_id INTEGER PRIMARY KEY,
  grant_id       INTEGER NOT NULL REFERENCES grant_award(grant_id),
  line_code      TEXT NOT NULL,               -- BUDGETLINE segment
  description    TEXT NOT NULL,
  category_code  TEXT NOT NULL REFERENCES cost_category(category_code),
  budget_amount  NUMERIC(14,2) NOT NULL CHECK (budget_amount >= 0),
  UNIQUE (grant_id, line_code)
);

CREATE TABLE cost_centre (
  cost_centre_code TEXT PRIMARY KEY,
  name             TEXT NOT NULL
);

CREATE TABLE approval_level (
  seq        INTEGER PRIMARY KEY,
  role_name  TEXT NOT NULL,
  min_amount NUMERIC(14,2) NOT NULL
);

-- ---------- Transactions ----------
CREATE TABLE purchase_request (
  request_id       TEXT PRIMARY KEY,
  description      TEXT NOT NULL,
  budget_line_id   INTEGER NOT NULL REFERENCES budget_line(budget_line_id),
  cost_centre_code TEXT NOT NULL REFERENCES cost_centre(cost_centre_code),
  request_date     DATE NOT NULL,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  actual_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  quotes_attached  INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','RECEIVED','INVOICED','PAID','REJECTED'))
);

CREATE TABLE request_approval (
  request_id  TEXT REFERENCES purchase_request(request_id),
  step        INTEGER,
  role_name   TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  action_date DATE,
  reason      TEXT,
  PRIMARY KEY (request_id, step)
);

CREATE TABLE journal_header (
  journal_id   INTEGER PRIMARY KEY,
  request_id   TEXT NOT NULL REFERENCES purchase_request(request_id),
  event_type   TEXT NOT NULL,                 -- APPROVE, RECEIVE, INVOICE, PAY
  journal_type TEXT NOT NULL CHECK (journal_type IN ('Actual','Encumbrance')),
  accounting_date DATE NOT NULL
);

CREATE TABLE journal_line (
  journal_id       INTEGER REFERENCES journal_header(journal_id),
  line_no          INTEGER,
  accounting_class TEXT NOT NULL,
  entity_code      TEXT NOT NULL,
  account          TEXT NOT NULL,
  fund             TEXT NOT NULL,
  budget_line      TEXT NOT NULL,
  cost_centre      TEXT NOT NULL,
  debit            NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit           NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (journal_id, line_no)
);
