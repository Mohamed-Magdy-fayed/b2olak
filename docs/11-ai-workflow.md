# AI workflow & delegation

How to work on ba2olak with an AI agent cheaply (fewer tokens) without losing quality.
The short version lives in `CLAUDE.md` → "Token economy & delegation"; this is the why
and the playbook.

## The core idea: context isolation, not just a cheaper model

When a high-capability model (Opus/Fable) runs as a **manager** and spawns a **subagent**,
the subagent runs in its **own context window**. The bulky part — reading 20 files,
sweeping the repo — happens in the worker's context and **never enters the manager's**.
The manager only pays (in its expensive context) for the worker's *distilled result*.

That's the real saving. "Use Haiku instead of Opus" helps too, but the bigger lever is
keeping megabytes of file content out of the pricey, long-lived manager conversation.

```
Without delegation:  manager reads 20 files  → 20 files sit in manager context forever
With delegation:     manager asks Explore    → Explore reads 20 files in its own context
                                              → returns a 15-line answer
                                              → only 15 lines enter manager context
```

## "Should the manager prompt the workers, or should I run many small sessions?"

**Usually let the manager do it.** Two reasons:

1. **The manager already holds the context** (the plan, the interfaces, what's been
   decided). It writes a tighter, more complete brief than you re-typing background into
   each new session.
2. **The heavy reads stay isolated** from the manager's context (above), which you don't
   get by running many top-level sessions that each reload context.

**The caveat — delegation isn't free.** Every spawn starts **cold**: the worker re-derives
context from scratch and cannot see your conversation. So:

- Delegation **wins** when the chunk is **big, read-heavy, or parallelizable** — the
  isolation saving beats the cold-start cost.
- Delegation **loses** when the chunk is **trivial or tightly coupled** to what you're
  doing — just do it inline; spawning would cost more than it saves.

## Delegate vs. inline — quick rubric

Delegate when **most** of these hold; otherwise inline:

| Favors delegating | Favors inline |
|---|---|
| Touches/reads many files | One or two known files |
| Read-heavy, returns a small answer | Needs the live conversation context |
| Independent of other in-flight work | Tightly coupled to the current edit |
| Parallelizable with siblings | A 2-line change |
| Well-specified acceptance criteria | Exploratory, you'll iterate by hand |

## Right-size the model

| Task | Model |
|---|---|
| Architecture, planning, ambiguous trade-offs, final review | Opus / Fable |
| Implementing a specified change, writing a tRPC procedure, refactor with clear target | Sonnet |
| Mechanical sweeps, read-only audits, grep-and-report, formatting | Haiku |

Subagent models are set in their `.claude/agents/*.md` frontmatter (`model:`). In this
repo the read-only auditors (`i18n-rtl-auditor`, `ui-auditor`, `migration-reviewer`) run
on **Haiku**; the code-writing `trpc-builder` runs on **Sonnet**. The manager is whatever
you launched (Opus/Fable).

## Subagent catalog (what to reach for)

| Need | Agent |
|---|---|
| Broad search / "where is X / how is Y done" across many files | `Explore` |
| Design an implementation approach before coding | `Plan` |
| i18n parity, RTL, raw-color compliance | `i18n-rtl-auditor` |
| Typography/button/menu/a11y compliance | `ui-auditor` |
| Review a DB schema/migration diff | `migration-reviewer` |
| Add/extend a tRPC procedure in the right tier | `trpc-builder` |

Prefer **one well-scoped subagent** over many tiny ones — each spawn has cold-start cost.

## Writing a good worker brief

The worker has **no memory of your conversation**. A good brief is self-contained:

- **What & where** — the goal, with concrete file paths (e.g.
  `packages/api/src/routers/orders.ts`).
- **Constraints** — the rules that apply (procedure tier, Zod validation, RTL, i18n
  parity, design system).
- **Acceptance criteria** — how the worker knows it's done (e.g. "typecheck passes;
  returns the list of file:line findings").
- **Return shape** — ask for the **conclusion only**, not a file dump, so the manager's
  context stays small.

## Parallelize independent work

Independent subtasks should be launched in **one message with multiple Agent calls** so
they run concurrently (e.g. an `Explore` of the web side and the mobile side at once).
Only serialize when one task's output feeds the next.

## Verify cheaply

Close the loop with `/gate` (typecheck + lint + test + build) and the test suite instead
of re-reading files to convince yourself a change is correct. A green gate is a cheaper,
stronger signal than re-loading context. See the verification loop in
[09-roadmap.md](./09-roadmap.md) and `CLAUDE.md`.
