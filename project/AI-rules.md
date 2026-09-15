## What the AI assistant should do in this assessment

From the brief (section 4.4 and acceptance checklist G), the AI assistant is a **grounded explanation layer** that sits on top of your deterministic engine. It is **read-only** and **never calculates, allocates, or confirms execution**.

### Core purpose

> “Add one small assistant panel that explains the structured result produced by your engine.”

It takes the **server-computed plan** (`PlanResult` + filtered `Operation[]`) and turns it into plain language with **traceable evidence IDs**.

---

## What it must answer for

The assessment names exactly **three supported questions**:

| # | Question | What the answer must contain |
|---:|---|---|
| 1 | **Which clients are at risk and why?** | Client IDs, status (`PARTIAL`/`UNSERVED`), reason (`STATION_CAPACITY_REACHED` or `INSUFFICIENT_COMPATIBLE_SEGMENT`), allocated vs demand tonnes. Baseline: C02, C09, C08. |
| 2 | **Which farm/segment gaps matter most today?** | Farm IDs, segment labels, expected vs actual variance. Baseline: Segment A is 11.7 t below plan; cite relevant farms. |
| 3 | **Why are 60 t going local and what is their estimated value?** | Segment, farm IDs, local tonnes, local value in EUR, reference price used. Baseline: 60 t D, EUR 4,500. |

Every answer must cite **resolvable client IDs, farm IDs, or segment labels**.

---

## What it must never do

- ❌ Calculate quantities, KPIs, or allocations  
- ❌ Change or propose a different plan  
- ❌ Confirm execution or write to any external system  
- ❌ Invent farms, clients, or segments not in the payload  
- ❌ Show a fake AI answer when no key or provider fails  

> “The assistant may explain the plan. It must not calculate or change allocations, confirm execution, or write external data.”

---

## Technical and behavioural requirements

- **Real model path when configured** (hosted or local). No purchase required.
- **No-key state:** honest message + clearly labelled deterministic summary built from `PlanResult`.
- **Minimal structured context:** send only what’s needed — KPIs, client statuses, local residuals, filtered operations. Not the raw log.
- **Validate model output:** remove or reject unknown IDs. If the answer isn’t in the inputs or computed plan, say it’s unavailable.
- **Handle** no-key, timeout, and invalid-output states honestly.
- **One grounded-answer check** and **one unsupported/provider-failure check** in tests.

---

## What “grounded” means in practice

Every number the assistant says must come from the server result.  
Example good answer for Q1:

> “C02 is PARTIAL because only 40 t of A were available against 50 t demand — reason: INSUFFICIENT_COMPATIBLE_SEGMENT. C09 is PARTIAL for the same reason on B. C08 is PARTIAL because the station reached its 500 t capacity — reason: STATION_CAPACITY_REACHED.”

Example bad answer:

> “C02 should get more A from F01.” ← This is allocation, not explanation.

---

## What it should answer for if asked something unsupported

If the user asks something outside the plan — weather, freight, next week’s forecast, a client not in the workbook — the assistant must say:

> “That information is not available in the supplied inputs or computed plan.”

No guessing, no hallucination.

---

## Summary table

| Area | AI responsibility |
|---|---|
| Role | Explain the deterministic plan |
| Input | `PlanResult` + filtered `Operation[]` |
| Output | Natural language with real IDs |
| Three questions | At-risk clients, farm/segment gaps, local residual & value |
| No-key | Honest state + deterministic fallback |
| Failure | Timeout/invalid output handled honestly |
| Boundaries | Read-only, no calculation, no execution |
| Tests | One grounded answer, one unsupported/failure |

That is the complete AI scope from the assessment.