# AI Agent Architecture & Design Patterns Reference Guide (2024-2026)

> **Compiled:** January 2026
> **Purpose:** Reference for AI agent reasoning patterns, state management, and agent loops

---

## Executive Summary

Key principles for building AI agents:

1. **Start Simple**: Build the right system for your needs, not the most sophisticated. Start with simple prompts, optimize with evaluation, and add agentic systems only when simpler solutions fall short.

2. **ReAct is the Default**: The ReAct (Reason + Act) pattern serves as a solid foundation for most agent use cases, combining chain-of-thought reasoning with tool use.

3. **State Management is Critical**: Modern agents require sophisticated memory systems, including hierarchical memory (short-term/long-term) and checkpointing.

> For multi-agent orchestration and framework comparisons, see [MULTI-AGENT-SYSTEMS-REFERENCE.md](MULTI-AGENT-SYSTEMS-REFERENCE.md)

---

## Table of Contents

1. [Core Reasoning Patterns](#1-core-reasoning-patterns)
2. [State and Memory Management](#2-state-and-memory-management)
3. [Agent Loop Design](#3-agent-loop-design)
4. [Tool Use Best Practices](#4-tool-use-best-practices)
5. [Comparison Tables](#5-comparison-tables)
6. [Key Citations and Sources](#6-key-citations-and-sources)

---

## 1. Core Reasoning Patterns

### 1.1 Chain-of-Thought (CoT)

**What it is:** A prompting technique that encourages the model to break down complex problems into intermediate reasoning steps before arriving at a final answer.

**When to use:**
- Mathematical reasoning and calculations
- Multi-step logical problems
- Tasks requiring explicit reasoning traces

**Implementation:**
```
Q: A store has 15 apples. They sell 7 and receive 12 more. How many do they have?

A: Let me think step by step.
1. Starting apples: 15
2. After selling 7: 15 - 7 = 8
3. After receiving 12: 8 + 12 = 20
The store has 20 apples.
```

**Pros:**
- Simple to implement (prompt engineering only)
- Improves accuracy on reasoning tasks
- Makes model thinking transparent and debuggable

**Cons:**
- Increases token usage
- May introduce errors if intermediate steps are wrong
- Limited to what's in the model's knowledge

---

### 1.2 ReAct (Reasoning + Acting)

**What it is:** A framework that interleaves reasoning traces ("Thoughts") with actions (tool calls) and observations (tool results). First introduced by Yao et al. in 2023.

**When to use:**
- Tasks requiring interaction with external tools
- Dynamic situations where the path to solution isn't obvious
- Problems requiring verification of intermediate results

**The ReAct Loop:**
```
Thought: I need to find the current weather in Tokyo
Action: get_weather(city="Tokyo")
Observation: {"temp": 22, "condition": "sunny"}
Thought: The weather is 22C and sunny. I have the answer.
Final Answer: Tokyo is currently 22C and sunny.
```

**Implementation Approach:**
1. Define available tools with clear descriptions
2. Prompt the model to reason before each action
3. Execute actions and feed observations back
4. Continue until the model reaches a final answer or max iterations

**Pros:**
- Reduces hallucination by grounding in external data
- Highly adaptive to intermediate results
- Natural integration of reasoning and tool use

**Cons:**
- Requires an LLM call for each step
- Can be expensive for complex tasks
- May struggle with long-term planning

---

### 1.3 Plan-and-Execute

**What it is:** An architecture where the agent first creates a complete plan, then executes it step by step. The opposite of ReAct's iterative approach.

**When to use:**
- Complex multi-step tasks with clear structure
- Tasks where a reasonable plan can be formulated initially
- Multi-module programming or research projects
- When cost optimization matters (smaller models for execution)

**Implementation:**
```python
# Phase 1: Planning (use capable model)
plan = planner.generate_plan(task)
# Returns: ["Step 1: Research topic", "Step 2: Outline", "Step 3: Draft", ...]

# Phase 2: Execution (can use smaller models per step)
for step in plan:
    result = executor.execute(step)
    if needs_replan(result):
        plan = planner.replan(task, completed_steps, result)
```

**Pros:**
- Cost savings (execution can use smaller models)
- Better for tasks with clear dependencies
- Forces explicit reasoning about the entire task
- Enables parallel execution of independent steps

**Cons:**
- Less adaptive to unexpected outcomes
- Quality varies significantly across models
- Replanning adds complexity

---

### 1.4 Self-Consistency

**What it is:** A decoding strategy that samples multiple diverse reasoning paths and selects the answer with the highest consistency across paths.

**When to use:**
- Mathematical reasoning where answers can be verified
- Tasks with a single correct answer
- When confidence in reasoning is important

**Implementation:**
```python
responses = []
for _ in range(num_samples):
    response = llm.generate(prompt, temperature=0.7)
    responses.append(extract_answer(response))

# Majority voting
final_answer = Counter(responses).most_common(1)[0][0]
```

**Performance Improvements:**
- GSM8K: +17.9%
- SVAMP: +11.0%
- AQuA: +12.2%
- StrategyQA: +6.4%

**Pros:**
- Significant accuracy improvements
- Works with any CoT approach
- Provides confidence estimation

**Cons:**
- Quadratic scaling in compute cost
- Not applicable to free-form generation
- Requires answers that can be compared for consistency

**Recent Advance - RASC (2024):** Reasoning-Aware Self-Consistency dynamically adjusts sample count, reducing sample usage by 80% while maintaining or improving accuracy by up to 5%.

---

### 1.5 Reflexion

**What it is:** A framework for "verbal reinforcement learning" where agents reflect on their failures and use that reflection to improve on subsequent attempts.

**Core Components:**
1. **Actor**: Generates text and actions based on state observations
2. **Evaluator**: Scores outputs and provides feedback
3. **Self-Reflection**: Generates verbal cues for self-improvement

**When to use:**
- Tasks where trial-and-error is acceptable
- Learning from mistakes is valuable
- Feedback signals are available (tests, validators)

**Implementation:**
```
Attempt 1: [Agent tries task, fails test]
Reflection: "I failed because I didn't handle the edge case of empty input.
            Next time, I should add input validation first."
Memory: [Store reflection in episodic memory]
Attempt 2: [Agent uses reflection to guide improved attempt]
```

**Performance (2024 Research):**
- Single-step tasks: >18% accuracy improvements
- Multi-Agent Reflexion (MAR) further improves by reducing degeneration-of-thought

**Pros:**
- Agents learn from their mistakes
- Reduces repeated errors
- Works across domains (coding, QA, planning)

**Cons:**
- Requires multiple attempts
- May reinforce incorrect patterns if evaluator is weak
- Memory management becomes important

---

### 1.6 Tree of Thoughts (ToT)

**What it is:** A framework that extends Chain-of-Thought by exploring multiple reasoning paths in a tree structure, with the ability to backtrack and try alternatives.

**When to use:**
- Problems with multiple valid approaches
- Tasks requiring exploration (puzzles, creative writing)
- When backtracking might be valuable

**Implementation:**
```python
def tree_of_thoughts(problem, depth=3, breadth=5):
    root = generate_initial_thoughts(problem, n=breadth)

    for thought in root:
        score = evaluate_thought(thought)
        if score > threshold:
            children = expand_thought(thought, n=breadth)
            # Recursively explore promising branches
            result = tree_of_thoughts(children, depth-1, breadth)
            if is_solution(result):
                return result

    # Backtrack if no solution found
    return None
```

**Search Strategies:**
- Breadth-First Search (BFS): Explore all options at current depth
- Depth-First Search (DFS): Explore one path deeply, then backtrack

**Performance:**
- Game of 24: 74% success (vs 4% for CoT)
- Crosswords: Significant improvements

**Pros:**
- Systematic exploration of solution space
- Ability to backtrack from dead ends
- Self-evaluation guides search

**Cons:**
- Computationally expensive
- Requires well-defined evaluation criteria
- Overkill for simple tasks

---

### 1.7 Graph of Thoughts (GoT)

**What it is:** Extends ToT by allowing arbitrary graph structures, enabling combining, refining, and looping between thoughts.

**Key Innovation:**
- Thoughts are vertices in a graph
- Edges represent dependencies and transformations
- Enables thought aggregation (combining multiple thoughts)
- Supports feedback loops for iterative refinement

**When to use:**
- Tasks where thoughts need to be combined
- Iterative refinement processes
- Complex reasoning with dependencies

**Performance:**
- Sorting: 62% quality improvement over ToT
- 31% cost reduction compared to ToT

**GitHub:** [spcl/graph-of-thoughts](https://github.com/spcl/graph-of-thoughts)

**Recent Advance - Adaptive Graph of Thoughts (AGoT, 2025):**
- +46.2% improvement on GPQA
- Dynamically adapts graph structure based on query complexity
- Unifies CoT, ToT, and GoT under one framework

---

## 2. State and Memory Management

### 2.1 The Context Window Challenge

**Problem:** LLMs can only "see" what's in their immediate context window. Traditional stateless operation limits what agents can achieve.

**Context Window Evolution:**
| Year | Model | Context Window |
|------|-------|----------------|
| 2022 | ChatGPT (launch) | 4K tokens |
| 2024 | Gemini 1.5 Pro | 1M tokens |
| 2025 | GPT-4.1 | 1M tokens |
| 2025 | Llama 4 | 10M tokens |

**The "Lost in the Middle" Problem:** Research shows LLMs recall information at the beginning or end of prompts better than content in the middle. Larger context doesn't guarantee better utilization.

---

### 2.2 Hierarchical Memory Architecture

**MemGPT Pattern:** Treat context windows like OS memory with a hierarchy:

```
+-------------------------------------+
|         Main Context               | <- "RAM" - Active working memory
|  (Current conversation, plans)     |
+-------------------------------------+
|       Archival Memory              | <- "Disk" - Long-term storage
|  (Past conversations, facts)       |
+-------------------------------------+
|        Recall Memory               | <- "Cache" - Quick retrieval
|  (Recent interactions index)       |
+-------------------------------------+
```

**Memory Types:**
1. **Short-Term Memory (STM)**: Last 5-9 interactions, implemented via context window
2. **Long-Term Memory (LTM)**: Persistent across sessions, uses external databases/vector stores
3. **Working Memory**: Currently active reasoning state

**Memory Blocks (Letta Framework):**
```python
# Structure context into discrete, functional units
memory_blocks = {
    "persona": "You are a helpful coding assistant...",
    "user_info": {"name": "Alice", "preferences": {...}},
    "current_task": "Implement authentication...",
    "recent_context": [...last N messages...],
}
```

---

### 2.3 State Persistence Patterns

**Checkpointing (LangGraph):**
```python
# Save state at critical decision points
checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

# State is automatically persisted after each node
# Can resume from any checkpoint
```

**Flow State (Simple):**
```json
{
  "task": {"id": "123", "title": "Fix auth timeout"},
  "phase": "implementation",
  "status": "in_progress",
  "exploration": {"keyFiles": [...]},
  "plan": {"steps": [...]},
  "pr": {"number": 456}
}
```

**Best Practices:**
- Checkpoint before API calls, tool invocations, and agent handoffs
- Separate learned patterns from temporary processing state
- Use flat, simple data structures over nested objects
- Store phase/status for resumability

---

### 2.4 Agentic Memory (AgeMem) - 2025 Research

**Key Innovation:** Expose memory operations as tool-based actions that the agent autonomously manages.

**Memory Tools:**
- `store(key, value)`: Save information
- `retrieve(query)`: Find relevant memories
- `update(key, new_value)`: Modify existing
- `summarize(memories)`: Compress multiple memories
- `discard(key)`: Remove outdated information

**Training:** Three-stage progressive reinforcement learning teaches unified memory behaviors.

---

## 3. Agent Loop Design

### 3.1 The Core Agent Loop

```
+--------------------------------------------------------------+
|                                                              |
|    +---------+    +---------+    +-------------+    +------+ |
|    | Gather  |--->|  Take   |--->|   Verify    |--->|Decide| |
|    | Context |    | Action  |    |   Work      |    |      | |
|    +---------+    +---------+    +-------------+    +------+ |
|         ^                                               |    |
|         +-----------------------------------------------+    |
|                        (if not complete)                     |
+--------------------------------------------------------------+
```

---

### 3.2 Loop Termination Strategies

**The Problem:** Agents can enter infinite loops, consuming resources and never completing.

**Loop Guardrails (External Enforcement):**
The system running the agent, not the agent itself, must guarantee termination.

**Termination Mechanisms:**

1. **Maximum Iteration Limits**
   ```python
   MAX_ITERATIONS = 20  # Hard limit
   for i in range(MAX_ITERATIONS):
       result = agent.step()
       if result.is_complete:
           break
   else:
       raise MaxIterationsExceeded()
   ```

2. **Token Budget Exhaustion**
   - Set a maximum token budget
   - Even if completion flag fails, budget stops execution

3. **Repetitive Output Detection**
   ```python
   recent_outputs = []
   SIMILARITY_THRESHOLD = 0.95

   def detect_loop(new_output):
       for prev in recent_outputs[-3:]:
           if similarity(new_output, prev) > SIMILARITY_THRESHOLD:
               return True
       recent_outputs.append(new_output)
       return False
   ```

4. **Sub-Agent Escalation**
   - Design evaluator agents to assess completion
   - "Is the document quality good enough?"
   - "Has consensus been reached?"

---

### 3.3 Completion Criteria Best Practices

**Problem:** Vague criteria cause premature exits or excessive cycling.

**Bad:** "Good quality content" (subjective, varies across iterations)

**Good:** "Content contains exactly 3 examples and 2 statistics" (specific, measurable)

**The Checkbox Pattern:**
```markdown
## Task Requirements
- [ ] Implement user authentication
- [ ] Add password validation
- [ ] Write unit tests (>80% coverage)
- [ ] Update documentation
```
Agent tracks completion by counting unchecked boxes. Works best for tasks with machine-verifiable success criteria.

---

### 3.4 Testing for Loop Vulnerabilities

**Adversarial Tests:**

1. **Ambiguous Stop Conditions**
   - Design prompts with vague termination criteria
   - Check if agent misinterprets them

2. **Broken Tool Simulation**
   - Mock tools returning errors, empty data, or identical responses
   - Verify agent doesn't get stuck retrying

3. **Resource Exhaustion Tests**
   - Run with low resource quotas
   - Observe when/how they fail

4. **Long-Running Noise Tests**
   - Interleave critical steps with irrelevant conversation
   - Check if agent loses track of primary goal

---

## 4. Tool Use Best Practices

### 4.1 Function Definition Guidelines

**Be Specific and Descriptive:**
```json
// Bad
{
  "name": "search",
  "description": "Search the web"
}

// Good
{
  "name": "web_search",
  "description": "Search the web for current information. Use this when the user asks about recent events, news, or data that may have changed since training cutoff.",
  "parameters": {
    "query": {
      "type": "string",
      "description": "The search query. Be specific and include relevant keywords."
    },
    "max_results": {
      "type": "integer",
      "description": "Maximum number of results to return (1-10)",
      "default": 5
    }
  }
}
```

---

### 4.2 Tool Definition Best Practices

1. **Use Strict Mode** (OpenAI)
   - Enables structured outputs
   - Reduces malformed responses
   - Requires `additionalProperties: false`

2. **Prefer Enums Over Descriptions**
   ```json
   // Instead of describing valid values
   "priority": {"type": "string", "enum": ["low", "medium", "high"]}
   ```

3. **Use Precise Types**
   - `integer` instead of `number` when appropriate
   - Specific formats for dates, emails, etc.

4. **Keep Definitions Concise**
   - Tool definitions consume tokens on every call
   - Be descriptive but not verbose

5. **Limit Tool Count**
   - Too many tools (50+) increases error risk
   - Consider embedding similarity for tool selection at scale

---

### 4.3 Handling Tool Calls

```python
# Always expect multiple tool calls
async def process_response(response):
    tool_calls = response.tool_calls or []

    results = await asyncio.gather(*[
        execute_tool(call) for call in tool_calls
    ])

    return results
```

---

### 4.4 The Agent Loop with Tools

```
+-------------------------------------------------------------+
|                       Agent Loop                            |
|                                                             |
|  1. User Input                                              |
|         |                                                   |
|         v                                                   |
|  2. LLM Decides ----------------------+                     |
|         |                             |                     |
|         v                             v                     |
|  3. Tool Call(s)?  --YES-->  Execute Tools                  |
|         |                         |                         |
|         | NO                      v                         |
|         |                  Return Observations              |
|         |                         |                         |
|         v                         |                         |
|  4. Generate Response <-----------+                         |
|         |                                                   |
|         v                                                   |
|  5. Return to User                                          |
|                                                             |
+-------------------------------------------------------------+
```

---

### 4.5 Common Tool Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Wrong tool selected | Ambiguous descriptions | Make descriptions more specific |
| Bad parameters | Unclear parameter docs | Add examples, use strict typing |
| Missing context | Tool definition lacks guidance | Add "when to use" in description |
| Observation misinterpretation | Tool output unclear | Structure tool responses consistently |

---

## 5. Comparison Tables

### 5.1 Reasoning Patterns Comparison

| Pattern | Complexity | Token Cost | Best For | Limitations |
|---------|------------|------------|----------|-------------|
| **Chain-of-Thought** | Low | Medium | Reasoning tasks | No external verification |
| **ReAct** | Medium | High (per step) | Tool-using agents | Short-term thinking |
| **Plan-and-Execute** | Medium | Lower overall | Structured multi-step | Less adaptive |
| **Self-Consistency** | Low | Very High (N samples) | Single-answer tasks | Not for free-form |
| **Reflexion** | High | High (multi-attempt) | Learning from failures | Needs evaluator |
| **Tree of Thoughts** | High | Very High | Exploration/search | Overkill for simple tasks |
| **Graph of Thoughts** | Very High | Very High | Complex dependencies | Implementation complexity |

---

### 5.2 Memory Strategies Comparison

| Strategy | Persistence | Scalability | Implementation | Best For |
|----------|-------------|-------------|----------------|----------|
| **Context Window Only** | None | Limited | Trivial | Simple, short tasks |
| **Sliding Window** | Session | Limited | Easy | Conversation agents |
| **Hierarchical (MemGPT)** | Long-term | High | Complex | Long-running agents |
| **Vector Store RAG** | Long-term | Very High | Medium | Knowledge-heavy tasks |
| **Agentic Memory** | Adaptive | High | Complex | Self-managing agents |

---

## 6. Key Citations and Sources

### Academic Papers

- Yao, S., et al. (2023). [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- Shinn, N., et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
- Yao, S., et al. (2023). [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601)
- Besta, M., et al. (2024). [Graph of Thoughts: Solving Elaborate Problems with Large Language Models](https://arxiv.org/abs/2308.09687)
- Wang, X., et al. (2022). [Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171)
- [Large Language Model Agent: A Survey on Methodology, Applications and Challenges](https://arxiv.org/abs/2503.21460) (March 2025)
- [The Landscape of Emerging AI Agent Architectures](https://arxiv.org/abs/2404.11584) (2024)
- [Agentic Memory: Unified Long-Term and Short-Term Memory Management](https://arxiv.org/html/2601.01885v1) (2025)

### Framework Documentation

- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Claude Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Cookbook - Agents](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents)

### Best Practices Guides

- [ReAct Prompting Guide](https://www.promptingguide.ai/techniques/react)
- [Self-Consistency Prompting Guide](https://www.promptingguide.ai/techniques/consistency)
- [Tree of Thoughts Prompting Guide](https://www.promptingguide.ai/techniques/tot)
- [Mastering LangGraph State Management](https://sparkco.ai/blog/mastering-langgraph-state-management-in-2025)

### GitHub Repositories

- [princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm)
- [spcl/graph-of-thoughts](https://github.com/spcl/graph-of-thoughts)
- [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- [anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook)
- [Awesome Agent Papers Collection](https://github.com/luo-junyu/Awesome-Agent-Papers)

---

*For multi-agent orchestration patterns and framework comparisons, see [MULTI-AGENT-SYSTEMS-REFERENCE.md](MULTI-AGENT-SYSTEMS-REFERENCE.md)*
