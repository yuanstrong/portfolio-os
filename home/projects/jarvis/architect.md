---
title: Architecture
brief: The runtime boundaries and the principles behind the local tool loop.
tags:
  - architecture
  - reliability
categories:
  - systems
---

# Architecture

Jarvis is organized around a small kernel that turns a request into explicit
steps. Each step can be inspected, checked against policy, and recorded with
its result.

```mermaid
flowchart TD
  Input[Structured input] --> Model[Model decision]
  Model --> Permission{Permission check}
  Permission -->|allow| Tool[Tool execution]
  Permission -->|deny| Review[Human review]
  Tool --> Event[Event log]
  Review --> Event
  Event --> Context[Next context]
  Context --> Model
```

The boundary is deliberately small: the model proposes an action, the policy
decides whether it may run, and the tool reports what actually happened.
