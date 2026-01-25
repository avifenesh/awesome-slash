# Context Efficiency Research

> Token optimization strategies for AI agent systems.

## Table of Contents
1. [The Context Problem](#1-the-context-problem)
2. [Prompt Caching](#2-prompt-caching)
3. [Content Ordering](#3-content-ordering)
4. [Token Reduction Patterns](#4-token-reduction-patterns)
5. [Dynamic Context Discovery](#5-dynamic-context-discovery)
6. [Cost Optimization](#6-cost-optimization)

---

## 1. The Context Problem

### Quadratic Complexity
> Computational cost increases quadratically with context length. Doubling context = 4x compute.

### Context Windows (2026)
| Provider | Model | Window |
|----------|-------|--------|
| Anthropic | Claude 4 | 200K tokens |
| OpenAI | GPT-5 | 128K tokens |
| Google | Gemini 2.0 | 1M+ tokens |
| Meta | Llama 4 | 10M tokens |

### The Implication
Bigger isn't always better. Right-size context for the task.

---

## 2. Prompt Caching

### Anthropic Claude

**Mechanism**: Explicit `cache_control` markers
```json
{
  "type": "text",
  "text": "Long system context...",
  "cache_control": { "type": "ephemeral" }
}
```

**Cache hierarchy**: `tools` → `system` → `messages`

**Minimum cacheable tokens**:
- 1024 tokens: Sonnet 4.5, Opus 4.1
- 2048 tokens: Haiku 3.5
- 4096 tokens: Opus 4.5, Haiku 4.5

**Cache lifetime**: 5 minutes default, 1-hour option available

**Up to 4 cache breakpoints** per request

### OpenAI

**Mechanism**: Automatic, no code changes required

**Works on**: All prompts 1024+ tokens

**Retention**:
- In-memory: 5-10 minutes
- Extended (24h): GPT-5.x models

**Cost**: No additional fees

### Google Gemini

**Mechanism**: Implicit (automatic) + Explicit (API-controlled)

**Implicit caching**: 90% cost savings, automatic

**Explicit caching**: API control over TTL

### Comparison

| Aspect | Anthropic | OpenAI | Google |
|--------|-----------|--------|--------|
| Control | Explicit markers | Automatic | Both |
| Cache writes | +25% cost | Free | Varies |
| Cache reads | -90% cost | Free | -90%+ |
| Min tokens | 1024-4096 | 1024 | 32K |
| Max TTL | 1 hour | 24 hours | 7 days |

---

## 3. Content Ordering

### Universal Principle
> "Place static content like instructions and examples at the beginning of your prompt, and put variable content, such as user-specific information, at the end."
> — Both Anthropic and OpenAI docs

### Optimal Order

1. **Tool definitions** (most cacheable)
2. **System prompt** (stable across sessions)
3. **Large static context** (documents, codebases)
4. **Examples** (few-shot demonstrations)
5. **Conversation history** (semi-variable)
6. **Current user message** (always variable)

### For Skills

```
[Skill definitions - CACHE]
[Skill knowledge bases - CACHE]
[Skill examples - CACHE]
[User query - NO CACHE]
```

---

## 4. Token Reduction Patterns

### From Production Tools

| Technique | Source | Savings |
|-----------|--------|---------|
| Long responses → files | Cursor | 46.9% |
| Dynamic tool discovery | Cursor | 46.9% |
| Graph-based repo maps | Aider | Significant |
| Query rewriting | CrewAI | Improved precision |
| Results limiting | CrewAI | Configurable |
| Score thresholds | CrewAI | Filter low-relevance |

### Practical Strategies

1. **Write outputs to files**
   - Agent writes long output to file
   - Returns file path, not content
   - Other agents read with `tail` as needed

2. **Summarize with access**
   - Compress conversation history
   - Keep full history searchable via grep
   - Agent can retrieve details on demand

3. **Lazy loading**
   - Tool names always available
   - Tool descriptions loaded on demand
   - Full schemas only when called

4. **Prioritized maps**
   - Aider's repo map: ~1K tokens shows entire repo structure
   - Graph ranking puts most relevant code first
   - LLM requests full files as needed

---

## 5. Dynamic Context Discovery

### Cursor's Innovation
Instead of pre-loading everything, let agents discover context:

| Static Approach | Dynamic Approach |
|-----------------|------------------|
| Load all MCP tool schemas | Load tool names only, schemas in files |
| Include full chat history | Summarize, make searchable |
| Pre-load all references | Agent greps for what it needs |
| Full terminal output | Sync to files, agent uses tail |

### Result
> "MCP dynamic discovery reduced agent tokens by 46.9%"

### Implementation
```javascript
// Instead of:
context.tools = getAllToolSchemas(); // 10K tokens

// Do:
context.tools = getToolNames(); // 500 tokens
context.files["tools/"] = getAllToolSchemas(); // Agent reads on demand
```

---

## 6. Cost Optimization

### Anthropic Pricing (per million tokens)

| Model | Base | Cache Write | Cache Read |
|-------|------|-------------|------------|
| Sonnet 4.5 | $3 | $3.75 | $0.30 |
| Opus 4.5 | $5 | $6.25 | $0.50 |
| Haiku 4.5 | $1 | $1.25 | $0.10 |

### Real-World Savings

| Use Case | Latency | Cost |
|----------|---------|------|
| Chat with book (100K cached) | -79% | -90% |
| Many-shot prompting (10K) | -31% | -86% |
| Multi-turn conversation | -75% | -53% |

### Break-Even Analysis
With 25% cache write cost and 90% read savings:
- **Break-even: 2 API calls**
- Cache writes pay off quickly

### OpenAI
- No additional fees for caching
- Pure performance gain

---

## Relevance to Skills

### Skill Loading Strategy

1. **Hot skills** (frequently used)
   - Load at session start
   - Use 1-hour cache TTL
   - Keep in system prompt

2. **Cold skills** (rarely used)
   - Load on demand only
   - Let cache expire
   - Reference in tool descriptions

### Token Budget per Skill

| Component | Target | Max |
|-----------|--------|-----|
| Metadata | ~100 tokens | 200 |
| Instructions | ~3000 tokens | 5000 |
| Examples | ~500 tokens | 1000 |
| **Total** | ~3600 tokens | 6200 |

### Multi-Skill Sessions

```
Session start:
- Load all skill metadata (~100 tokens each)
- Cache system prompt with skill definitions
- Zero skills fully loaded

Skill activation:
- Load full SKILL.md (~3000 tokens)
- Cache as new breakpoint
- Resources loaded on demand

Subsequent calls:
- Cache read for static content
- Only new user input is fresh tokens
```

---

## Key Takeaways

1. **Order matters** - Static first, dynamic last
2. **Cache aggressively** - 2 calls to break even
3. **Lazy load everything** - Metadata first, content on demand
4. **Files are cheap** - Write long outputs, read selectively
5. **Summarize with access** - Compress but keep searchable
6. **Test token usage** - Monitor cache hit rates

---

*Compiled from Anthropic, OpenAI, Google, Cursor, Aider, and framework documentation.*
