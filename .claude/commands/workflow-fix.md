---
description: Created with Workflow Studio
allowed-tools: Task,AskUserQuestion
---
```mermaid
flowchart TD
    start_node_default([Start])
    find_doc_agent[find-doc-agent]
    analyze_doc_agent[analyze-doc-agent]
    append_modification_plan_agent[append-modification-plan-agent]
    implement_changes_agent[implement-changes-agent]
    build_test_agent[build-test-agent]
    append_results_agent[append-results-agent]
    end_node_default([End])

    start_node_default --> find_doc_agent
    find_doc_agent --> analyze_doc_agent
    analyze_doc_agent --> append_modification_plan_agent
    append_modification_plan_agent --> implement_changes_agent
    implement_changes_agent --> build_test_agent
    build_test_agent --> append_results_agent
    append_results_agent --> end_node_default
```

## Workflow Execution Guide

Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.

### Execution Methods by Node Type

- **Rectangle nodes**: Execute Sub-Agents using the Task tool
- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response
- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)
- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below
