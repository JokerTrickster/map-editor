---
description: Created with Workflow Studio
allowed-tools: Task,AskUserQuestion
---
```mermaid
flowchart TD
    start_node_default([Start])
    requirements_analysis[requirements-analysis]
    document_check[document-check]
    doc_exists_check{If/Else:<br/>Conditional Branch}
    create_new_doc[create-new-doc]
    update_existing_doc[update-existing-doc]
    implementation[implementation]
    test_and_build[test-and-build]
    validation_check{If/Else:<br/>Conditional Branch}
    update_documentation[update-documentation]
    fix_issues[fix-issues]
    retest[retest]
    revalidation_check{If/Else:<br/>Conditional Branch}
    end_success([End])
    end_needs_attention([End])

    start_node_default --> requirements_analysis
    requirements_analysis --> document_check
    document_check --> doc_exists_check
    doc_exists_check -->|Document Found| update_existing_doc
    doc_exists_check -->|No Document| create_new_doc
    create_new_doc --> implementation
    update_existing_doc --> implementation
    implementation --> test_and_build
    test_and_build --> validation_check
    validation_check -->|Success| update_documentation
    validation_check -->|Failure| fix_issues
    update_documentation --> end_success
    fix_issues --> retest
    retest --> revalidation_check
    revalidation_check -->|Success| update_documentation
    revalidation_check -->|Still Failing| end_needs_attention
```

## Workflow Execution Guide

Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.

### Execution Methods by Node Type

- **Rectangle nodes**: Execute Sub-Agents using the Task tool
- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response
- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)
- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below

### If/Else Node Details

#### doc_exists_check(Binary Branch (True/False))

**Evaluation Target**: document search results

**Branch conditions:**
- **Document Found**: Existing documentation found in docs/features/
- **No Document**: No existing documentation found

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.

#### validation_check(Binary Branch (True/False))

**Evaluation Target**: test and build results

**Branch conditions:**
- **Success**: All tests pass and build succeeds without errors
- **Failure**: Tests fail or build has errors

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.

#### revalidation_check(Binary Branch (True/False))

**Evaluation Target**: retest results

**Branch conditions:**
- **Success**: All tests now pass and build succeeds
- **Still Failing**: Tests still fail or build has errors

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.
