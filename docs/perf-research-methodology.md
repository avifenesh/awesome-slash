# Performance Research Methodology

> Extracted from real Java GLIDE performance investigation sessions.
> Use this to inform `/perf` agent behavior and skill design.
>
> **Canonical requirements live in:** `docs/perf-requirements.md`

---

## User Demands & Behavioral Requirements

### 1. Sequential Execution - No Parallel Benchmarks

**User quote:**
> "dont run parallel every" → "one bench at a time, otherwise you create noise"

**Requirement:** Benchmarks MUST run sequentially. Parallel execution creates interference and invalidates results.

**Agent behavior:**
- Never spawn parallel benchmark processes
- Wait for each benchmark to complete before starting next
- Queue benchmarks and process one at a time

---

### 2. Minimum Duration for Stability

**User quote:**
> "duration at least 60"

**Requirement:** Benchmarks need minimum 60-second duration for stable results. Short runs (20s) produce unreliable data.

**Agent behavior:**
- Default duration: 60 seconds minimum
- Warmup period: 10 seconds before measurement
- Reject or warn on duration < 60s

---

### 3. Prove Each Change Individually

**User quote:**
> "We have baselines. we prove every change on itself, not many together, each one should show success."

**Requirement:** Isolate variables. Never bundle multiple changes in one test. Each optimization must be proven independently.

**Agent behavior:**
- One change per benchmark run
- Compare against known baseline
- If testing change A and B, run: baseline → A → baseline → B → baseline → A+B
- Document which specific change is being tested

---

### 4. Start Narrow, Then Expand

**User quote:**
> "one bench at a time" and "increase the batch test, specific permutation - 5 clients, 10k qps, 24kb"

**Requirement:** Focus on specific permutations first. Don't run full matrix until you understand specific cases.

**Agent behavior:**
- Start with single configuration that reproduces issue
- Only expand to full matrix after understanding the specific case
- Use binary search for finding breaking points, not exhaustive search

---

### 5. Commit Frequently, Document Everything

**User quote:**
> "every once in a while, commit, on every commit update our session and conversation in workflow session file, its for me for later use"

**Requirement:** Git is the diary. Commit after every significant finding. Update documentation on every commit.

**Agent behavior:**
- Commit after each benchmark run with results
- Commit after each code change
- Include findings in commit messages
- Update workflow log with each commit

---

### 6. No Assumptions - Verify Everything

**User quote:**
> "you need to be brutally correct. Everything we do should be proved."

**Requirement:** No guessing. Every claim must have evidence. If uncertain, run the test.

**Agent behavior:**
- Never assume performance impact - measure it
- Question assumptions in existing docs (e.g., "worker_threads(2) its 1 by default")
- Verify claims against actual code/config
- Re-run anomalous results before drawing conclusions

---

### 7. Clean Slate Between Tests

**User quote:**
> "clean up the repo besides docs, the code should be aligned with upstream main"

**Requirement:** Code must be clean before benchmarking. Only docs/benchmarks differ from upstream.

**Agent behavior:**
- Reset code to baseline before testing changes
- Keep benchmark results and docs separate
- Don't let accumulated changes pollute tests

---

### 8. Resource Efficiency - Be a Good Guest

**User quote:**
> "the goal is not to takeover the user machine and extremely misuse it, but to find a way to use as little as necessary resources, while allowing scaling base on need"
> "We are guests in the user machine, we not first class consumers, we want to use the least possible."

**Requirement:** Minimal resource usage. Don't spawn maximum threads/processes just because you can.

**Agent behavior:**
- Start with minimal resources
- Scale only when proven necessary
- Prefer lazy initialization over eager
- Track and report resource usage

---

### 9. Understand Before Changing

**User quote:**
> "theres memory ordering in a strict way, someone wrote it. why?"

**Requirement:** Before changing code, understand WHY it was written that way. Check git history.

**Agent behavior:**
- Run `git log` / `git blame` on code before modifying
- Document original author's intent
- Understand trade-offs of original design
- Only change with full context

---

### 10. Distinguish Terminology Precisely

**User quote:**
> "batch and hmget are not similar scenarios"

**Requirement:** Clarify terminology upfront. What user means may differ from what code/docs say.

**Agent behavior:**
- Ask for clarification when terms are ambiguous
- Document terminology definitions
- Don't conflate similar-sounding concepts

---

## Research Workflow Steps

### Phase 1: Setup & Clarification

1. **Clarify scenario definitions**
   - What exactly is being tested?
   - What are the parameters? (payload size, QPS, client count)
   - What metrics matter? (p50, p99, errors, throughput)

2. **Clarify success criteria**
   - What defines "pass" vs "fail"?
   - What's acceptable latency?
   - What error rate is tolerable?

3. **Identify baseline versions**
   - What versions to compare against?
   - Where are baseline results stored?

---

### Phase 2: Baseline Establishment

1. **Run baseline benchmarks**
   - All versions (e.g., 2.0.0, 2.2.4, current)
   - Standard configurations
   - Document test environment

2. **Store results systematically**
   - JSON for machine parsing
   - MD for human reading
   - Include all metadata (timestamp, config, commit)

3. **Identify anomalies**
   - Which configs show unexpected results?
   - Mark for deeper investigation

---

### Phase 3: Breaking Point Discovery

**Methodology: Binary Search**

```
1. Pick extreme QPS (e.g., 10k) - likely fails
2. Pick safe QPS (e.g., 1k) - likely passes
3. Binary search to find exact breaking point:
   - 5k → OK → try 7.5k
   - 7.5k → FAIL → try 6.25k
   - Continue until ±500 QPS precision
4. Document: "Version X breaks at ~Y QPS"
```

**Key finding pattern:**
> "run short tests to find the breaking point of the qps"

Use short tests (30s) for binary search, then confirm with full duration (60s+).

---

### Phase 4: Constraint Testing

**Add resource constraints to expose issues:**

1. **CPU limiting**
   ```bash
   taskset -c 0-3 ./benchmark  # Limit to 4 cores
   ```

2. **Memory limiting**
   ```bash
   ulimit -v <bytes>
   ```

3. **Compare constrained vs unconstrained**
   - Issues often appear only under constraints
   - Production environments have constraints

---

### Phase 5: Hypothesis Generation

**User insight pattern:**
> "The reason, probably, that we have contention in compare to uds is..."

1. **Analyze architecture differences**
   - Compare working version vs broken version
   - Identify what changed

2. **Generate ranked hypotheses**
   - H1: Most likely cause (with evidence)
   - H2: Second most likely
   - ...

3. **Design validation experiments**
   - What test would prove/disprove each hypothesis?

---

### Phase 6: Code Path Analysis

**User request pattern:**
> "follow the path from response return back from the server to until its back in java"

1. **Trace critical paths**
   - Request path: client → server
   - Response path: server → client
   - Error path: where failures occur

2. **Identify bottlenecks**
   - Lock contention points
   - Serialization overhead
   - Memory allocation patterns

3. **Quantify overhead**
   - "121 JNI calls per batch" (concrete number)
   - "32% of time in db.query" (percentage)

---

### Phase 7: Profiling

**Tools used in real session:**

1. **Rust profiling (perf)**
   ```bash
   perf record -p $(pgrep -f benchmark) -g --call-graph dwarf sleep 30
   perf report
   ```
   - Requires: `strip = false`, `debug = 2` in Cargo.toml

2. **Java profiling (JFR)**
   ```bash
   java -XX:StartFlightRecording=duration=30s,filename=recording.jfr ...
   jfr print --events jdk.ExecutionSample recording.jfr
   ```

3. **Identify hot spots**
   - Function with highest % of samples
   - Call chains leading to hot spots

---

### Phase 8: Optimization & Validation

**Pattern: Change → Benchmark → Compare**

1. **Make single change**
   - Document exactly what changed
   - Include before/after code snippets

2. **Run same benchmark as baseline**
   - Identical parameters
   - Same environment

3. **Compare results**
   - Better? By how much?
   - Worse? Investigate why
   - Same? Change may not matter

4. **Commit with results**
   ```
   feat: Remove clone in batch send path

   Before: p99 = 4.5ms
   After:  p99 = 3.2ms
   Improvement: 29%
   ```

---

### Phase 9: Decision Points

**When to close a PR / abandon an approach:**

User decision pattern:
> "ok lets close the pr and go to pr 1"

**Criteria for abandoning:**
- Architectural limitations (can't be fixed without major rewrite)
- Overhead exceeds benefit
- Simpler alternative exists

**Document the decision:**
- Why abandoned
- What was learned
- Whether to revisit later

---

### Phase 10: Consolidation

**User request pattern:**
> "Accumulate all the results... merge them. clean up files... I need one source of truth."

1. **Single baseline per version**
   - One JSON file per version
   - Remove intermediate results

2. **Remove noise**
   - Keep only meaningful comparisons
   - Keep collapse markers (breaking points)
   - Remove redundant configs

3. **Document final state**
   - What files exist
   - What each contains
   - How to reproduce

---

## Key Behavioral Patterns for Agents

### Pattern 1: Verification Loop

```
User: "X should work"
Agent: "Let me verify X"
→ Run test
→ Report actual result
→ If different from expectation: investigate
```

### Pattern 2: Anomaly Investigation

```
Result seems wrong?
1. Re-run the test (could be transient)
2. Check for environmental factors
3. If reproducible: investigate root cause
```

### Pattern 3: Escalating Detail

```
Start: High-level overview
→ User asks for more
→ Drill into specific area
→ User asks for more
→ Trace exact code path
```

### Pattern 4: Baseline Comparison

```
Every result must be compared to:
1. Previous version baseline
2. Expected/theoretical performance
3. Other configurations (different client counts, etc.)
```

### Pattern 5: User-Driven Focus

```
User: "specific permutation - 5 clients, 10k qps, 24kb"
Agent: Focus ONLY on that permutation
→ Don't expand scope without explicit request
→ Go deep before going wide
```

---

## Critical User Quotes for Agent Prompts

### On Methodology
> "one bench at a time, otherwise you create noise"
> "duration at least 60"
> "we prove every change on itself, not many together"

### On Resource Usage
> "we are guests in the user machine"
> "use as little as necessary resources"
> "squeeze maximum from few threads before adding more"

### On Documentation
> "every commit update our session"
> "log also the conversation... what i was insisting on"
> "for later build improvements from it"

### On Correctness
> "you need to be brutally correct"
> "Everything we do should be proved"
> "dont run into action, we are designing together"

---

## Anti-Patterns to Avoid

1. **Don't run benchmarks in parallel** - creates noise
2. **Don't bundle changes** - can't isolate effects
3. **Don't assume** - verify everything
4. **Don't expand prematurely** - narrow focus first
5. **Don't guess parameters** - ask user
6. **Don't skip baselines** - always compare
7. **Don't ignore anomalies** - investigate them
8. **Don't over-provision resources** - start minimal

---

## Benchmark Parameters Reference

### Standard Durations
- Binary search / quick test: 30s
- Full validation: 60s minimum
- Warmup: 10s

### Client Counts
- Single client: 1 (most common use case)
- Multi-client: 5, 10 (stress testing)
- Breaking point discovery: focus on single count first

### QPS Progression
- Low: 1k, 3k
- Medium: 5k, 7k
- High: 10k, 50k
- Extreme: 70k+

### Payload Sizes
- Small: 100b, 1KB
- Medium: 8KB
- Large: 16KB+ (DBB threshold)
- Very large: 20KB, 24KB

---

## State Tracking Requirements

### Per Investigation
```json
{
  "investigation_id": "string",
  "issue": "description of problem",
  "started_at": "timestamp",
  "current_phase": "setup|baseline|breaking_point|profiling|optimization",
  "hypotheses": [],
  "validated_changes": [],
  "rejected_changes": [],
  "baselines": {},
  "current_results": {}
}
```

### Per Benchmark Run
```json
{
  "run_id": "string",
  "timestamp": "ISO8601",
  "version": "string",
  "scenario": "string",
  "params": {
    "qps": "number",
    "clients": "number",
    "payload": "number",
    "duration": "number"
  },
  "results": {
    "p50": "number",
    "p99": "number",
    "errors": "number",
    "actual_qps_pct": "number"
  },
  "comparison_to_baseline": {
    "version": "string",
    "p50_delta_pct": "number",
    "p99_delta_pct": "number"
  }
}
```

---

## Summary: What Makes Good Performance Research

1. **Rigorous** - Every claim has evidence
2. **Isolated** - One variable at a time
3. **Documented** - Every step recorded
4. **Comparative** - Always vs baseline
5. **Iterative** - Refine understanding through cycles
6. **Focused** - Narrow before wide
7. **Resource-conscious** - Minimal footprint
8. **User-driven** - Follow user's direction, don't assume
