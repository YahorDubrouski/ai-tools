# Prompting Techniques

## Overview

This document summarizes practical prompting techniques for working with large language models (LLMs). Use this as a 
quick reference while developing or running GPT-based projects.

## Best practices
1. Keep conversations and context under ~32,000 tokens when possible. See documentation: `32000Tokens.pdf` and 
`32000Tokens.txt`. Example - [32000Tokens.txt](32000Tokens.txt).
2. Treat each feature or task as a separate GPT project.
3. Role prompting - f.e. "You are a Senior Frontend Engineer."
4. Be specific: give concrete requirements. 
5. Provide context. 
6. Specify desired output format, and examples. 
7. Start with Refinement session. 
8. Prefer structured prompts (role, context, instruction, constraints, examples, output schema). 
9. Use iterative refinement: ask for a plan, then request step-by-step execution.

## Context chunking — how to handle huge projects.
1. Embeddings -> Vector DB

![EmbeddingsDiagram.png](EmbeddingsDiagram.png)

2. Summarization layers 
3. Hierarchical chunking

## Example realization in the JS Game

### Create a project

![CreateGptProject.png](CreateGptProject.png)

### Prompt that realize all the rules

![InitialPrompt.txt](prompts/InitialPrompt.png)

Text version of the prompt - [InitialPrompt.txt](prompts/InitialPrompt.txt)

---
