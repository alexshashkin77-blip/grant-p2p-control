# How AI was used

| Step | Who did it | How it was checked |
|---|---|---|
| Business rules (eligibility, budget control, approval chain, procurement thresholds) | Me, from ERP finance implementation practice | Reviewed against typical donor agreements |
| Accounting design (event → journal line rule → account derivation, accrue at receipt, encumbrance) | Me, based on how ERP subledger accounting engines are set up | Worked example in `05-accounting-rules.md` checked line by line |
| User stories and acceptance criteria | Drafted with Claude from my rules, edited by me | Each story maps to tests and UAT cases |
| Engine code (`engine.js`) | Generated with Claude from the stories, reviewed by me | 12 unit tests (`npm test`) |
| Screen (`index.html`) | Generated with Claude, iterated on screenshots | UAT scripts in `06-uat-test-cases.md` |
| SQL model and reports | Generated with Claude, reviewed by me | Run on SQLite against the seed data; every control query returns its expected exception |

## Working method

1. Write the rule in plain language first (story + acceptance criteria).
2. Ask the AI for the smallest code change that satisfies it.
3. Turn the acceptance criteria into a test before accepting the code.
4. Review the diff: business logic must sit in `engine.js` only, never in the screen.
5. Commit one feature at a time.

The point of the split: business rules stay readable and testable by a finance person, and the AI-written UI can be
replaced without touching them.
