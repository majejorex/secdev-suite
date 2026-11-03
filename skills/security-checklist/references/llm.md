# OWASP Top 10 for LLM Applications 2025

IDs and titles are copied from the official `OWASP/www-project-top-10-for-large-language-model-applications` repository, folder `2_0_vulns`, checked on 2026-11-03. The "What to look at" text is our own. Used with P2-04 (AI and LLM) and P0-08 (spend caps).

| ID | Title (OWASP) | What to look at |
|----|---------------|-----------------|
| LLM01:2025 | Prompt Injection | Documents, web pages, emails and tool results reach the prompt as data, never as instructions; no secret or privileged action depends on the model "refusing" |
| LLM02:2025 | Sensitive Information Disclosure | Prompts, retrieved context and logs hold no secrets or other users' data; retrieval filters by the caller's permissions |
| LLM03:2025 | Supply Chain | Models, datasets, plugins and MCP servers come from pinned, trusted sources |
| LLM04:2025 | Data and Model Poisoning | Training, fine-tuning and RAG sources are controlled; who can write to them |
| LLM05:2025 | Improper Output Handling | Model output is validated and encoded before it reaches a shell, a query, HTML or another system |
| LLM06:2025 | Excessive Agency | Tools have the least permission; destructive or paid actions need a human approval; the tool checks the user's rights, not the model |
| LLM07:2025 | System Prompt Leakage | The system prompt holds no secrets or access rules; authorization lives outside the prompt |
| LLM08:2025 | Vector and Embedding Weaknesses | Per-tenant access control on the vector store; no cross-tenant retrieval |
| LLM09:2025 | Misinformation | Answers that drive decisions are grounded and checked; the user is told the limits |
| LLM10:2025 | Unbounded Consumption | Token, request and spend caps per user; timeouts; limits on input size and tool loops |

Mapping to the checklist: LLM01, LLM05, LLM06 and LLM07 are P2-04 plus P0-02 (authorization outside the model); LLM02 and LLM08 are P0-03; LLM03 is P0-16; LLM10 is P0-08.
