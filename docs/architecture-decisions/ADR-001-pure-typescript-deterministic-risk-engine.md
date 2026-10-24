# ADR-001: Pure TypeScript Deterministic Risk Engine

## Status
**Accepted**

## Context
Urban flood alert tools frequently rely on either complex 2D hydrodynamic differential equation solvers (e.g. SWMM) or opaque machine-learning neural networks. Hydrodynamic solvers take hours to run, making live commuter routing impossible. Machine-learning models require extensive local sensor training data that does not exist for Tumakuru, and their predictions cannot be audited or explained to municipal staff when an inspection priority is challenged.

## Decision
Implement the hydrological risk engine as a **pure, deterministic, zero-dependency mathematical function** in TypeScript (`src/lib/risk.ts`). The engine computes a normalized $0-100$ score across four transparent factors:
$$R = 0.40 \cdot S_{\text{rain}} + 0.25 \cdot S_{\text{blockage}} + 0.20 \cdot S_{\text{history}} + 0.15 \cdot S_{\text{elevation}}$$
The computation executes in $<1$ millisecond in-memory, requiring zero network calls or GPU accelerators.

## Consequences
- **Positive:** 100% reproducible and testable. Commuters and municipal workers receive clear human-readable explanations (e.g. *"High risk due to 35mm rain + 2 severe plastic blockages in low basin"*).
- **Negative / Limitation:** Does not model physical fluid momentum or backwater conduit pressure. Must be explicitly documented as an explainable heuristic index, not a calibrated numerical fluid simulation.
