# Golden fixtures

Recorded characterization fixtures for the **Always-Green Strangler** re-platform
(see `docs/revamp/REPORT.md` §3.3–§3.4).

Each fixture captures the **current** implementation's output at a facade
boundary — LLM stream parts, tool-call sequences, or UIMessage streams — so a
new implementation can be proven equivalent before the old code is deleted.

## Rules

1. **The fixture is the contract.** Never hand-edit a fixture to make a test
   pass. Regenerating one is an explicit, reviewed decision.
2. **Recording is opt-in.** Fixtures are only written when `UPDATE_GOLDEN=1`:

   ```bash
   UPDATE_GOLDEN=1 npm run test:run
   ```

3. **Deterministic.** Fixtures are serialised with sorted object keys
   (`stableStringify`) so structurally-equal payloads are byte-identical.

## Layout

```
golden/
  llm/           # provider stream parts, tool-call sequences (Phase 3)
  orchestrator/  # golden runs of representative prompts (Phase 2)
  ui/            # UIMessage streams (Phase 6)
```

Utilities live in `src/test/golden/index.ts`.
