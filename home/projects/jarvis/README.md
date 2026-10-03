---
title: Jarvis
brief: A local-first agent runtime and content platform for building reliable tools.
start_date: 2026-01-25
updated_at: 2026-09-03
status: active
featured: true
tags:
  - agents
  - local-first
  - systems
categories:
  - infrastructure
  - developer-tools
---

# Jarvis

Jarvis is a local-first agent runtime for composing reliable tool loops,
structured inputs, and observable model interactions. The project keeps the
runtime close to the developer while leaving room for explicit permissions,
replayable actions, and inspectable state.

![Jarvis architecture](assets/architecture.svg)

## Direction

The project focuses on making agent behavior understandable and controllable:

- inputs are structured before tools are invoked;
- permissions are evaluated against the requested action;
- failures remain visible instead of being hidden behind a generic retry;
- local content can be published as part of the same working environment.

Read the [architecture notes](architect.md) for the current system boundaries.

```mermaid
flowchart LR
  User[User request] --> Kernel[Jarvis kernel]
  Kernel --> Policy[Permission policy]
  Policy --> Tools[Local tools]
  Tools --> State[Inspectable state]
  State --> Kernel
```
