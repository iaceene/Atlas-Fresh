# 1. What is the actual business problem?

Atlas Fresh has:

* **20 farms**
* **1 conditioning station**
* **10 export clients**
* Apples divided into **A, B, C, D**
* A = highest quality, D = lowest
* The station can export only **500 tonnes/day**. 

Before the day starts, the company has a **plan**:

```text
Farm 01
Expected: 30t
A: 30%
B: 40%
C: 20%
D: 10%
```

And Commercial has client orders:

```text
Client C01
Demand: 100t
Rule: EXACT A
Price: €1200/t
```

But the farms don't necessarily produce what was expected.

On this particular day:

```text
Expected production = 600t
Actual production   = 560t

Station capacity    = 500t
```

And the actual quality distribution is:

```text
A = 90t
B = 160t
C = 180t
D = 130t
```

The PDF says the A segment is **11.7t below plan**, while B and C are also below plan and D is above plan. 

So the business has a problem:

**Who gets the available apples?**

---

# 2. Why can't we simply give apples to clients in any order?

Because clients have different:

### Quality requirements

For example:

```text
C01 → EXACT A
```

means:

> C01 can ONLY receive A.

But:

```text
C02 → MINIMUM B
```

means:

> C02 can receive B or better.

So:

```text
MINIMUM B
```

accepts:

```text
A ✓
B ✓
C ✗
D ✗
```

The engine implements exactly this distinction. 

---

# 3. Clients also pay different prices

Imagine:

```text
C01 → €1,200/t
C02 → €1,000/t
C03 → €800/t
```

If you have only 100 tonnes available, which client's export order should be processed first?

The assignment tells you:

> **Higher export price first.**

Then if two clients have the same price:

> sort by `client_id`.

That's exactly what your engine does here:

```ts
const sortedClients = [...clients].sort((a, b) => {
  if (b.export_price_per_t_eur !== a.export_price_per_t_eur) {
    return b.export_price_per_t_eur - a.export_price_per_t_eur;
  }

  return a.client_id.localeCompare(b.client_id);
});
```

So if you have:

```text
C01 €1000
C02 €1300
C03 €1000
```

the engine processes:

```text
C02
C01
C03
```

because:

```text
1300 > 1000

and C01 < C03
```

The PDF explicitly requires this ordering. 

---

# 4. Now comes the important part: farm → client allocation

This is really the heart of your engine.

The workbook **doesn't tell you**:

```text
Farm 01 → Client 03
Farm 02 → Client 07
...
```

There is deliberately **no farm-to-client mapping**.

Your engine has to create it.

The PDF says a farm can serve multiple clients and a client can receive from multiple farms/segments. 

Your engine starts by creating this:

```ts
supply[farm.farm_id] = {
    A: farm.actual_A_t,
    B: farm.actual_B_t,
    C: farm.actual_C_t,
    D: farm.actual_D_t,
};
```

So conceptually it creates:

```text
Farm 01
 ├── A: 20t
 ├── B: 10t
 ├── C: 15t
 └── D: 5t

Farm 02
 ├── A: 10t
 ├── B: 20t
 ├── C: 10t
 └── D: 10t

...
```

This is the **actual supply**, not the expected supply.

That's important.

---

# 5. Expected production is NOT used to allocate

This is a subtle point in the assignment.

You have:

```text
Expected
Actual
```

Expected is used for **comparison**.

Actual is used for **allocation**.

Your engine correctly does:

```ts
A: farm.actual_A_t
B: farm.actual_B_t
C: farm.actual_C_t
D: farm.actual_D_t
```

The PDF explicitly says:

> planned values are for comparison, not allocation. 

So don't accidentally use:

```text
expected_A
expected_B
...
```

when deciding what can actually be exported.

---

# 6. How does the engine determine what a client can receive?

Suppose:

```text
Client:
requested_segment = B
acceptance_mode = MINIMUM
```

The engine calls:

```ts
getCompatibleSegments(B, MINIMUM)
```

and returns:

```text
[A, B]
```

because A is better than B.

For:

```text
MINIMUM C
```

it returns:

```text
[A, B, C]
```

For:

```text
EXACT C
```

it returns:

```text
[C]
```

This is directly based on the quality hierarchy:

```text
A
↓
B
↓
C
↓
D
```

where higher means better quality. 

---

# 7. But if MINIMUM B accepts A and B, which one does it take?

This is another important rule.

Suppose:

```text
Client wants MINIMUM B
```

and supply is:

```text
Farm 01 → A 50t
Farm 02 → B 50t
```

You **shouldn't automatically consume the A**.

Why?

Because A is a better quality than requested. You want to avoid wasting high-quality fruit where B would have been enough.

Your engine calculates:

```ts
upgrade = requested - actual
```

Conceptually:

```text
Requested B

Actual B → upgrade 0
Actual A → upgrade 1
```

Then it sorts:

```ts
options.sort((a, b) => {
    if (a.upgrade !== b.upgrade)
        return a.upgrade - b.upgrade;

    return a.farm_id.localeCompare(b.farm_id);
});
```

So:

```text
B first
A second
```

That's what the PDF means by:

> "Sort compatible supply by the smallest quality upgrade, then farm_id." 

---

# 8. Then the engine actually allocates tonnes

This is the actual decision:

```ts
const take = Math.min(
    remainingDemand,
    availableFromSupply,
    availableStation
);
```

This is excellent because **three limits** must simultaneously be respected.

Suppose:

```text
Client demand = 100t
Farm segment available = 70t
Station remaining capacity = 50t
```

Then:

```text
take = min(100, 70, 50)
     = 50t
```

So:

```text
Client gets 50t
```

Then:

```text
remainingDemand -= 50
stationUsed += 50
supply[farm][segment] -= 50
```

The engine updates all three states.

---

# 9. Why the station capacity matters

This is another major part of the problem.

Actual production:

```text
560t
```

but station capacity:

```text
500t
```

Therefore:

```text
560t actual
  ↓
500t maximum export
  ↓
60t MUST go local
```

The PDF gives exactly this baseline:

```text
Export = 500t
Local = 60t
Export rate = 89.3%
```



Your engine tracks:

```ts
let stationUsed = 0;
```

and never allows:

```text
stationUsed > capacity
```

because allocation uses:

```ts
availableStation = capacity - stationUsed
```

and then:

```ts
take = Math.min(
    remainingDemand,
    availableFromSupply,
    availableStation
);
```

So the station capacity becomes a **hard limit**.

---

# 10. What happens when a client doesn't get everything?

The engine determines:

```ts
if (allocatedToClient === client.demand_t)
    status = 'COMPLETE';

else if (allocatedToClient > 0)
    status = 'PARTIAL';

else
    status = 'UNSERVED';
```

So:

### COMPLETE

```text
Demand    = 100t
Allocated = 100t
```

→ `COMPLETE`

### PARTIAL

```text
Demand    = 100t
Allocated = 60t
```

→ `PARTIAL`

### UNSERVED

```text
Demand    = 100t
Allocated = 0t
```

→ `UNSERVED`

These definitions are explicitly specified in the PDF. 

---

# 11. And WHY was the client not fulfilled?

Your engine has two shortage reasons:

```ts
STATION_CAPACITY_REACHED
```

or

```ts
INSUFFICIENT_COMPATIBLE_SEGMENT
```

For example:

### Case 1 — Not enough compatible apples

Client:

```text
Demand = 100t
EXACT A
```

Available A:

```text
60t
```

Station still has capacity.

Result:

```text
Allocated = 60t
Remaining = 40t
Status = PARTIAL

Reason:
INSUFFICIENT_COMPATIBLE_SEGMENT
```

### Case 2 — Station is full

Suppose:

```text
Demand = 100t
Compatible supply = 200t
Station remaining = 30t
```

The client receives:

```text
30t
```

Then station reaches:

```text
500t
```

Result:

```text
PARTIAL
STATION_CAPACITY_REACHED
```

The assessment specifically requires these reasons. 

---

# 12. What happens to the apples that weren't exported?

This is the **local residual**.

After all clients are processed, the engine goes through every:

```text
Farm
    ↓
Segment
```

and calculates:

```ts
local = originalActual - exported;
```

So imagine:

```text
Farm 01
A actual = 50t
A exported = 40t
```

Then:

```text
A local = 10t
```

That 10t goes to the local market.

---

# 13. Why does the local residual matter so much?

Because local market value is only:

```text
10% of reference export price
```

The PDF explicitly says that local fruit is worth only 10% of the reference export price for its quality segment. 

For example:

```text
Segment A reference price = €1000/t
```

Then local value:

```text
€1000 × 10%
= €100/t
```

If:

```text
10t goes local
```

then:

```text
Local value = 10 × €100
            = €1,000
```

Your engine calculates exactly that:

```ts
const localValue =
    local * station.local_market_ratio * referencePrices[seg];
```

---

# 14. Finally, the engine calculates the KPIs

After allocation and local fallback, your engine calculates:

```ts
const exportVolume = stationUsed;
```

Then:

```ts
exportRevenue =
    sum(allocation.tonnes × client.price)
```

Then:

```ts
totalValue =
    exportRevenue + totalLocalValue
```

And:

```ts
exportRate =
    exportVolume / totalActual
```

And:

```ts
atRiskClients =
    PARTIAL + UNSERVED
```

Your final KPI object is:

```text
expected_plan_t
actual_received_t

actual_A_t
actual_B_t
actual_C_t
actual_D_t

station_capacity_t

export_volume_t
local_volume_t

export_rate

export_revenue_eur
local_value_eur
total_value_eur

at_risk_clients
```



---

# 15. So your engine is basically doing this

Think about it as a pipeline:

```text
             WORKBOOK
                 │
        ┌────────▼────────┐
        │  Actual farms   │
        │  Client orders  │
        │  Station limits │
        └────────┬────────┘
                 │
                 ▼
       ┌───────────────────┐
       │ Sort clients by   │
       │ price DESC        │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ Find compatible   │
       │ farm + segments   │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ Prefer smallest   │
       │ quality upgrade   │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ Allocate in 5t    │
       │ steps             │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ Demand / supply / │
       │ station limits    │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ Remaining fruit   │
       │ → local market    │
       └────────┬──────────┘
                │
                ▼
       ┌───────────────────┐
       │ KPIs + statuses   │
       │ + explanations    │
       └───────────────────┘
```

---

# 16. And this explains your `PlanResult`

Your engine returns:

```ts
return {
    allocations,
    clients: clientResults,
    farmSegmentBalances,
    kpis
};
```

So **`PlanResult` is basically the complete answer to the business problem.**

### `allocations`

Answers:

> **Who got apples from where?**

```text
Farm → Segment → Client → Tonnes → Revenue
```

### `clients`

Answers:

> **Did each client get what they wanted? Why/why not?**

```text
Demand
Allocated
Remaining
Status
Reason
Revenue
```

### `farmSegmentBalances`

Answers:

> **What happened to every farm + segment?**

```text
Actual
Exported
Local
Local value
```

### `kpis`

Answers:

> **What is the overall business result?**

```text
560t actual
500t export
60t local
89.3% export rate
€549,500 export revenue
€4,500 local value
€554,000 total value
```

The PDF requires the server to return exactly these categories of results. 

---

# 17. One very important thing about your architecture

Your engine is **not the frontend**.

You can think of your application as:

```text
                    SERVER
                       │
              ┌────────▼────────┐
              │ Excel / Dataset │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   VALIDATION    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     ENGINE      │
              │                 │
              │ deterministic   │
              │ planning policy │
              └────────┬────────┘
                       │
                       ▼
                  PlanResult
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Production   Commercial   Allocation
       View          View         Detail
          │            │            │
          └────────────┼────────────┘
                       ▼
                   AI Assistant
```

This is also why the PDF specifically says **not to ask an LLM to choose farms/clients, calculate quantities, enforce constraints, or produce KPIs**. The deterministic engine is the source of truth. 

The LLM comes **after** the engine and only explains the result.

---

## The most important concept to remember

If you have to explain this project during your interview, say it like this:

> **"The engine takes actual farm production and commercial client requirements, then applies a deterministic allocation policy. It prioritizes clients by export price, filters supply according to each client's quality rule, prefers the smallest quality upgrade, and allocates in 5-tonne steps while respecting client demand and the 500-tonne station capacity. Anything that cannot be exported becomes local-market residual. The engine then produces traceable allocations, client statuses and shortage reasons, farm-segment balances, and business KPIs."**

That is essentially the entire technical/business problem in one paragraph.

And importantly, **your current engine already implements the core planning logic described by the assessment**. What remains around it is mainly the server integration, validation, tests, API response, and the Production/Commercial UI and grounded assistant required by the brief. The assessment's mandatory requirements spell those boundaries out. 
