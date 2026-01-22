# LLM Function Calling & Tool Use: Comprehensive Reference (2024-2026)

A production-grade reference for implementing function calling and tool use with Large Language Models. This document synthesizes best practices from Anthropic, OpenAI, MCP specification, and industry research.

---

## Table of Contents

1. [Tool Schema Design Checklist](#1-tool-schema-design-checklist)
2. [Description Writing Guidelines](#2-description-writing-guidelines)
3. [Tool Selection Optimization](#3-tool-selection-optimization)
4. [Parallel Tool Calls](#4-parallel-tool-calls)
5. [Error Handling Patterns](#5-error-handling-patterns)
6. [Tool Composition & Chaining](#6-tool-composition--chaining)
7. [Security Considerations](#7-security-considerations)
8. [Sandboxing & Isolation](#8-sandboxing--isolation)
9. [MCP (Model Context Protocol)](#9-mcp-model-context-protocol)
10. [Structured Outputs & Constrained Decoding](#10-structured-outputs--constrained-decoding)
11. [Performance Optimization](#11-performance-optimization)
12. [Common Pitfalls](#12-common-pitfalls)
13. [Real-World Examples](#13-real-world-examples)
14. [Sources](#14-sources)

---

## 1. Tool Schema Design Checklist

### Required Elements

```json
{
  "name": "get_weather",
  "description": "Get the current weather in a given location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "The city and state, e.g. San Francisco, CA"
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature unit"
      }
    },
    "required": ["location"]
  }
}
```

### Schema Design Best Practices

| Guideline | Why It Matters |
|-----------|----------------|
| **Use descriptive names** | `get_weather` not `gw` - helps model selection |
| **Prefer flat structures** | Heavily nested schemas reduce generation quality |
| **Include parameter descriptions** | Model relies on these for argument selection |
| **Use enums for constrained values** | Prevents invalid states, improves reliability |
| **Mark required fields explicitly** | Prevents missing critical parameters |
| **Set `additionalProperties: false`** | Strict mode requirement (OpenAI) |
| **Version your tools** | `get_weather_v2` allows gradual migration |
| **Limit to ~20 tools per request** | More tools = higher error rates |
| **Keep descriptions under 1024 chars** | Azure OpenAI limit; good practice generally |

### Automatic Schema Generation

**Recommended**: Generate schemas automatically from code to avoid drift.

```python
# OpenAI SDK with Pydantic
from openai import OpenAI
from pydantic import BaseModel

class WeatherParams(BaseModel):
    location: str
    unit: str = "celsius"

# Auto-generate schema
client.chat.completions.create(
    tools=[{"type": "function", "function": pydantic_function_tool(WeatherParams)}]
)
```

**Tools for schema generation:**
- Python: `pydantic`, `inspect` module
- OpenAI SDK: `pydantic_function_tool()` utility
- Anthropic: JSON Schema with `input_schema`

---

## 2. Description Writing Guidelines

### The "Intern Test"

> "Can an intern/human correctly use the function given nothing but what you gave the model?"

If not, add more context.

### Writing Effective Descriptions

**Function Description:**
- Explain what the function does and when to use it
- Include context about expected inputs and outputs
- Mention limitations or edge cases

**Parameter Descriptions:**
- Describe format expectations (e.g., "IANA timezone like America/Los_Angeles")
- Explain relationships between parameters
- Include examples for complex inputs

### Good vs. Bad Examples

```json
// BAD
{
  "name": "search",
  "description": "Search for things",
  "input_schema": {
    "properties": {
      "q": { "type": "string" },
      "n": { "type": "integer" }
    }
  }
}

// GOOD
{
  "name": "search_products",
  "description": "Search the product catalog by keyword. Returns matching products with prices. Use for inventory queries or price checks.",
  "input_schema": {
    "properties": {
      "query": {
        "type": "string",
        "description": "Search keywords. Supports AND/OR operators. Example: 'laptop AND gaming'"
      },
      "max_results": {
        "type": "integer",
        "description": "Maximum results to return (1-100, default 10)",
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": ["query"]
  }
}
```

### System Prompt Integration

Use system prompts to guide tool selection:

```
You are a customer service agent. You have access to:
- order_lookup: Use when customer asks about order status
- product_search: Use when customer asks about products
- escalate_to_human: Use when issue cannot be resolved

Always verify order numbers before looking them up.
Never use order_lookup for general questions.
```

---

## 3. Tool Selection Optimization

### Why Tool Selection Fails

| Issue | Cause | Solution |
|-------|-------|----------|
| Wrong tool selected | Ambiguous descriptions | Make descriptions distinct |
| Too many tools | Confusion from choices | Use "Less-is-More" approach |
| Missing parameters | Incomplete user input | Prompt for clarification |
| Hallucinated tools | Model invents tools | Use strict mode |

### The "Less-is-More" Approach

Research shows that **dynamically reducing available tools improves accuracy by up to 89%** and reduces execution time by 80%.

**Implementation:**
1. Pre-filter tools based on user intent
2. Present only 3-5 relevant tools per turn
3. Use a routing layer to select tool subsets

### Improving Selection Accuracy

1. **Fine-tuning**: Train on task-specific tool usage examples
2. **In-context learning**: Provide examples of correct tool selection
3. **Chain-of-thought prompting**: Force reasoning before tool calls

**Claude-specific prompt for better selection:**
```
Before calling a tool, analyze:
1. Which tool is relevant to the user's request?
2. Are all required parameters available?
3. Can missing parameters be reasonably inferred?

If parameters are missing, ask for them instead of guessing.
```

---

## 4. Parallel Tool Calls

### When to Use Parallel Calls

Use parallel tool calls when:
- Operations are **independent** (no data dependencies)
- You need results from **multiple sources**
- **Latency optimization** is important

### Implementation

**OpenAI**: Control with `parallel_tool_calls` parameter

```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    tools=[...],
    parallel_tool_calls=True  # Default: True
)
```

**Anthropic**: Claude automatically decides when to parallelize

```python
# Claude returns multiple tool_use blocks in one response
response.content = [
    {"type": "tool_use", "id": "id1", "name": "get_weather", "input": {...}},
    {"type": "tool_use", "id": "id2", "name": "get_time", "input": {...}}
]

# Return all results in one user message
{
    "role": "user",
    "content": [
        {"type": "tool_result", "tool_use_id": "id1", "content": "72F"},
        {"type": "tool_result", "tool_use_id": "id2", "content": "3:00 PM"}
    ]
}
```

### LLMCompiler Framework

Academic research on parallel function calling:
- **3.7x latency speedup**
- **6.7x cost savings**
- **~9% accuracy improvement**

Components:
1. Function Calling Planner
2. Dependency Graph Builder
3. Parallel Executor

Available in LangGraph/LangChain.

---

## 5. Error Handling Patterns

### Error Response Format

**Anthropic:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_abc123",
  "content": "Error: Location 'xyz' not found. Please provide a valid city name.",
  "is_error": true
}
```

**OpenAI:**
```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "Error: Invalid API key. Please check credentials."
}
```

### Retry Strategies

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| **Exponential backoff** | Rate limits (429) | Wait 2^n seconds + jitter |
| **Immediate retry** | Transient errors (503) | Max 3 attempts |
| **No retry** | Validation errors (400) | Return error to model |
| **Fallback model** | Tool invocation fails | Try GPT-4 instead of GPT-3.5 |

### Circuit Breaker Pattern

Prevent cascading failures:

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
def call_external_api(params):
    return api.execute(params)
```

States:
- **Closed**: Normal operation
- **Open**: Blocking calls (too many failures)
- **Half-Open**: Testing recovery

### Error Handling Best Practices

1. **Validate before execution**: Check parameters match schema
2. **Return structured errors**: Include error type, message, suggestions
3. **Let model retry**: Provide error context, model may self-correct
4. **Log all failures**: Enable debugging and pattern detection
5. **Set timeouts**: Prevent hanging on slow tools

---

## 6. Tool Composition & Chaining

### Sequential Chaining

One tool's output feeds the next:

```
get_location() -> "San Francisco, CA"
                        ↓
get_weather("San Francisco, CA") -> "72F, Sunny"
```

**Key considerations:**
- Output format must match next tool's input
- Handle intermediate failures gracefully
- Track state across the chain

### Workflow Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Sequential** | Linear pipeline | Data transformation |
| **Parallel** | Independent operations | Multi-source queries |
| **Conditional** | Branching based on results | Validation flows |
| **Loop** | Repeat until condition | Pagination, polling |

### Anthropic's Recommendation

> "Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents are systems where LLMs dynamically direct their own processes."

**Start with workflows** for predictable tasks; **use agents** for open-ended problems.

### Implementation Tips

1. **Test each step individually** before chaining
2. **Define clear interfaces** between tools
3. **Handle partial failures** (some tools succeed, some fail)
4. **Add checkpoints** for long-running workflows
5. **Consider state persistence** for resumability

---

## 7. Security Considerations

### OWASP Top 1: Prompt Injection

Prompt injection is the **#1 vulnerability** in LLM applications (73% of deployments affected).

**Types:**
- **Direct injection**: User crafts malicious prompts
- **Indirect injection**: Malicious content in external data (websites, documents)

### Defense Strategies

| Layer | Technique | Description |
|-------|-----------|-------------|
| Input | **Validation** | Check parameter types, ranges, formats |
| Input | **Sanitization** | Strip/escape dangerous characters |
| Input | **Intent detection** | Classify user intent before tool calls |
| Processing | **Prompt templates** | Parameterize user input like SQL params |
| Processing | **Privilege separation** | Privileged LLM never touches raw content |
| Output | **Format validation** | Ensure outputs follow expected schema |
| Output | **Content filtering** | Remove sensitive data before display |

### Input Validation Example

```python
def validate_tool_input(tool_name: str, params: dict) -> dict:
    schema = get_tool_schema(tool_name)

    # Type validation
    for param, value in params.items():
        expected_type = schema["properties"][param]["type"]
        if not isinstance(value, TYPE_MAP[expected_type]):
            raise ValidationError(f"Invalid type for {param}")

    # Range validation
    if "maximum" in schema["properties"].get(param, {}):
        if value > schema["properties"][param]["maximum"]:
            raise ValidationError(f"{param} exceeds maximum")

    # Enum validation
    if "enum" in schema["properties"].get(param, {}):
        if value not in schema["properties"][param]["enum"]:
            raise ValidationError(f"Invalid value for {param}")

    return params  # Validated
```

### Tool Permission Model

```python
TOOL_PERMISSIONS = {
    "read_file": {"requires_approval": False, "scope": "read"},
    "write_file": {"requires_approval": True, "scope": "write"},
    "execute_command": {"requires_approval": True, "scope": "execute"},
    "send_email": {"requires_approval": True, "scope": "external"},
}

def execute_tool(tool_name: str, params: dict, user_approved: bool = False):
    perms = TOOL_PERMISSIONS[tool_name]

    if perms["requires_approval"] and not user_approved:
        raise PermissionError(f"{tool_name} requires explicit user approval")

    return tools[tool_name](**params)
```

---

## 8. Sandboxing & Isolation

### Why Sandboxing Matters

AI-generated code can:
- Access filesystem (SSH keys, credentials)
- Make network requests (data exfiltration)
- Execute arbitrary commands
- Consume unlimited resources

### Isolation Technologies

| Technology | Isolation Level | Latency | Use Case |
|------------|-----------------|---------|----------|
| **Docker** | Process + namespace | Low | Development, trusted code |
| **gVisor** | User-space kernel | Medium | Semi-trusted code |
| **Firecracker microVM** | Full VM | Medium | Untrusted code |
| **WebAssembly** | Memory-safe sandbox | Very Low | Lightweight isolation |

### Recommended Architecture

```
┌─────────────────────────────────────────┐
│              Host System                │
│  ┌───────────────────────────────────┐  │
│  │       Sandbox Controller          │  │
│  │  (orchestrates, validates)        │  │
│  └───────────────────────────────────┘  │
│                    │                    │
│  ┌─────────────────┴─────────────────┐  │
│  │      Isolated Sandbox             │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Code Execution Environment │  │  │
│  │  │  - No network by default    │  │  │
│  │  │  - Read-only filesystem     │  │  │
│  │  │  - Resource limits          │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Layered Defense

1. **Application layer**: Input validation, output filtering
2. **Container layer**: Namespace isolation, resource limits
3. **Network layer**: Firewall rules, VPC isolation
4. **Kernel layer**: gVisor or VM isolation

### Claude Code Sandboxing

Claude Code supports multiple sandbox modes:
- **Docker-based**: Full container isolation
- **macOS Sandbox**: Apple's seatbelt framework
- **Permission-based**: Tool-level access control

---

## 9. MCP (Model Context Protocol)

### Overview

MCP is an **open standard** (November 2024) for connecting LLMs to external tools and data sources. Adopted by Anthropic, OpenAI, Google, and Microsoft.

### Architecture

```
┌────────────────────┐
│     MCP Host       │  (Claude Desktop, IDEs)
│  (LLM Application) │
└─────────┬──────────┘
          │
┌─────────┴──────────┐
│    MCP Client      │  (Connection manager)
└─────────┬──────────┘
          │ JSON-RPC 2.0
┌─────────┴──────────┐
│    MCP Server      │  (Tool provider)
│  - Resources       │
│  - Prompts         │
│  - Tools           │
└────────────────────┘
```

### Server Primitives

| Primitive | Description | Example |
|-----------|-------------|---------|
| **Resources** | Context/data for models | Files, database queries |
| **Prompts** | Templated messages | Workflow templates |
| **Tools** | Executable functions | API calls, computations |

### Security Principles

1. **User Consent**: Explicit approval for all data access
2. **Data Privacy**: No transmission without consent
3. **Tool Safety**: Untrusted descriptions require verification
4. **LLM Sampling Controls**: User approves all sampling requests

### Building an MCP Server

```python
# Using FastMCP (Python)
from mcp import FastMCP

mcp = FastMCP("My Server")

@mcp.tool()
def search_docs(query: str) -> str:
    """Search documentation for the given query."""
    return search_engine.search(query)

@mcp.resource("docs/{path}")
def get_doc(path: str) -> str:
    """Retrieve a documentation file."""
    return read_file(f"docs/{path}")

mcp.run()
```

### Converting MCP to Claude Format

```python
async def get_claude_tools(mcp_session):
    mcp_tools = await mcp_session.list_tools()

    return [{
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema  # Note: rename required
    } for tool in mcp_tools.tools]
```

---

## 10. Structured Outputs & Constrained Decoding

### What is Structured Output?

Guarantees that model output conforms to a JSON schema. No more parsing errors or missing fields.

### OpenAI: Strict Mode

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "strict": True,  # Enable guaranteed schema conformance
            "parameters": {...}
        }
    }]
)
```

### Anthropic: Strict Tool Use

```python
response = client.messages.create(
    model="claude-sonnet-4-5",
    tools=[{
        "name": "get_weather",
        "strict": True,  # Guaranteed schema validation
        "input_schema": {...}
    }]
)
```

### Constrained Decoding

Modifies token probabilities in real-time to enforce structure:

```
Normal generation:     {"name": "J... (any token valid)
Constrained:           {"name": "J... (only valid JSON continuations)
```

**Libraries:**
- Outlines (Python)
- Guidance (Microsoft)
- XGrammar
- vLLM (built-in support)

### Potential Pitfalls

1. **Order sensitivity**: Put reasoning fields before conclusion fields
2. **Latency increase**: Constraint checking adds overhead
3. **Semantic changes**: Constraints may alter content, not just format

---

## 11. Performance Optimization

### Token Efficiency

| Technique | Savings | Description |
|-----------|---------|-------------|
| **Minimize tool descriptions** | 10-30% | Remove unnecessary verbosity |
| **Use deferred loading** | 50%+ | Load tools only when needed |
| **Clear old tool results** | 20-40% | Automatic context management |
| **Batch parallel calls** | 30-50% | Reduce round trips |

### Anthropic Advanced Features

**Tool Search Tool** (Beta):
- Mark tools with `defer_loading: true`
- Claude loads only needed tools
- Supports thousands of tools without context overflow

**Automatic Tool Result Clearing** (Beta):
- Add `context-management-2025-06-27` header
- Old tool results automatically cleared near token limit

**Programmatic Tool Calling** (Beta):
- Claude writes Python to call tools
- Reduces context overhead
- Managed sandbox execution

### Latency Optimization

1. **Pre-warm connections**: Keep tool endpoints ready
2. **Parallel execution**: Run independent tools concurrently
3. **Caching**: Cache tool results for repeated queries
4. **Edge deployment**: Run tools close to users
5. **Streaming**: Return partial results as available

---

## 12. Common Pitfalls

### Schema Issues

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Schema drift** | Backend changes, model doesn't know | Version tools, validate at edge |
| **Nested schemas** | Lower generation quality | Flatten when possible |
| **Generic names** | Poor tool selection | Use descriptive names |
| **Missing descriptions** | Model guesses wrong | Always include descriptions |

### Runtime Issues

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Tool hallucination** | Model invents tools | Use strict mode, validate calls |
| **Non-idempotent tools** | Retries cause duplicates | Design idempotent operations |
| **Latency blowups** | Slow tools block responses | Set timeouts, use async |
| **Context exhaustion** | Too many tool results | Clear old results, summarize |

### Security Issues

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **No input validation** | Injection attacks | Validate all parameters |
| **Trusting tool output** | Compromised tools | Validate outputs too |
| **Over-privileged tools** | Unnecessary capabilities | Principle of least privilege |
| **No audit logging** | Can't detect attacks | Log all tool invocations |

### Misconceptions

> **"LLMs call functions"**
> No. LLMs **generate** structured requests. Your code executes the function.

> **"Strict mode is slower"**
> Often faster - constrained decoding can accelerate by skipping invalid tokens.

> **"More tools = more capable"**
> Usually the opposite. More tools = more confusion and errors.

---

## 13. Real-World Examples

### Customer Service Agent

```python
tools = [
    {
        "name": "lookup_order",
        "description": "Look up order details by order ID. Use when customer asks about order status, tracking, or delivery.",
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "string",
                    "description": "Order ID in format ORD-XXXXX",
                    "pattern": "^ORD-[A-Z0-9]{5}$"
                }
            },
            "required": ["order_id"]
        }
    },
    {
        "name": "process_refund",
        "description": "Initiate a refund for an order. Requires user confirmation before execution.",
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "reason": {
                    "type": "string",
                    "enum": ["damaged", "wrong_item", "late_delivery", "changed_mind"]
                },
                "amount": {
                    "type": "number",
                    "description": "Refund amount in USD. Must not exceed order total."
                }
            },
            "required": ["order_id", "reason"]
        }
    }
]
```

### Data Analysis Pipeline

```python
# Sequential tool chain with validation
tools = [
    {
        "name": "query_database",
        "description": "Execute read-only SQL query against analytics database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "SQL SELECT query. No INSERT/UPDATE/DELETE allowed."
                },
                "limit": {
                    "type": "integer",
                    "default": 100,
                    "maximum": 10000
                }
            }
        }
    },
    {
        "name": "create_chart",
        "description": "Generate a chart from query results.",
        "input_schema": {
            "type": "object",
            "properties": {
                "data": {"type": "array"},
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "pie", "scatter"]
                },
                "x_axis": {"type": "string"},
                "y_axis": {"type": "string"}
            }
        }
    }
]
```

### MCP-Based File System Tool

```python
from mcp import FastMCP

mcp = FastMCP("Filesystem Tools")

@mcp.tool()
def read_file(path: str, encoding: str = "utf-8") -> str:
    """Read contents of a file. Path must be within allowed directories."""
    if not is_safe_path(path):
        raise PermissionError("Access denied: path outside allowed directories")

    with open(path, encoding=encoding) as f:
        return f.read()

@mcp.tool()
def list_directory(path: str) -> list[str]:
    """List files in a directory. Returns file names only, not contents."""
    if not is_safe_path(path):
        raise PermissionError("Access denied")

    return os.listdir(path)

@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Write content to a file. Requires explicit user approval."""
    # This would be gated by MCP consent flow
    with open(path, "w") as f:
        f.write(content)
    return f"Wrote {len(content)} bytes to {path}"
```

---

## 14. Sources

### Official Documentation

- [Anthropic - Tool Use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Anthropic - Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Anthropic - Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [OpenAI - Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI - o3/o4-mini Function Calling Guide](https://cookbook.openai.com/examples/o-series/o3o4-mini_prompting_guide)
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Example Servers](https://modelcontextprotocol.io/examples)

### Research Papers

- [LLMCompiler: An LLM Compiler for Parallel Function Calling (ICML 2024)](https://arxiv.org/abs/2312.04511)
- [An LLM-Tool Compiler for Fused Parallel Function Calling](https://arxiv.org/abs/2405.17438)
- [Tool Learning with Language Models: A Survey](https://link.springer.com/article/10.1007/s44336-025-00024-x)
- [LLM-Based Agents for Tool Learning: A Survey](https://link.springer.com/article/10.1007/s41019-025-00296-9)
- [Less is More: Optimizing Function Calling for Edge Devices](https://arxiv.org/html/2411.15399v1)

### Security Resources

- [OWASP LLM Top 10 - Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Microsoft - Protecting Against Indirect Injection in MCP](https://developer.microsoft.com/blog/protecting-against-indirect-injection-attacks-mcp)
- [AWS - Safeguard AI from Prompt Injections](https://aws.amazon.com/blogs/security/safeguard-your-generative-ai-workloads-from-prompt-injections/)
- [Claude Code Sandboxing](https://code.claude.com/docs/en/sandboxing)

### Implementation Guides

- [How JSON Schema Works for LLM Tools](https://blog.promptlayer.com/how-json-schema-works-for-structured-outputs-and-tool-integration/)
- [LangChain - Tool Error Handling](https://python.langchain.com/docs/how_to/tools_error/)
- [LiteLLM - Fallbacks and Retries](https://docs.litellm.ai/docs/completion/reliable_completions)
- [Google ADK - Safety and Security](https://google.github.io/adk-docs/safety/)
- [NVIDIA - Sandboxing Agentic AI with WebAssembly](https://developer.nvidia.com/blog/sandboxing-agentic-ai-workflows-with-webassembly/)

### Industry Analysis

- [MCP Wikipedia - Model Context Protocol](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [A Year of MCP: From Internal Experiment to Industry Standard](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [State of LLMs 2025](https://magazine.sebastianraschka.com/p/state-of-llms-2025)
- [LLM Function Calling Pitfalls Nobody Mentions](https://medium.com/@2nick2patel2/llm-function-calling-pitfalls-nobody-mentions-a0a0575888b1)

---

## Quick Reference Card

### Tool Definition Template

```json
{
  "name": "verb_noun",
  "description": "What it does. When to use it. What it returns.",
  "input_schema": {
    "type": "object",
    "properties": {
      "required_param": {
        "type": "string",
        "description": "Format: X. Example: Y"
      },
      "optional_param": {
        "type": "string",
        "enum": ["a", "b", "c"],
        "description": "Constrained values"
      }
    },
    "required": ["required_param"],
    "additionalProperties": false
  }
}
```

### Error Response Template

```json
{
  "type": "tool_result",
  "tool_use_id": "id",
  "content": "Error: [TYPE]. [WHAT WENT WRONG]. [SUGGESTION].",
  "is_error": true
}
```

### Security Checklist

- [ ] Validate all input parameters
- [ ] Sanitize user-provided strings
- [ ] Use strict mode for schema enforcement
- [ ] Implement tool-level permissions
- [ ] Log all tool invocations
- [ ] Set execution timeouts
- [ ] Sandbox code execution
- [ ] Require approval for sensitive operations

---

*Last updated: January 2026*
*Version: 1.0*
