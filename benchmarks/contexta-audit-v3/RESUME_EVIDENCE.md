# Contexta AI — SDE & AI Systems Engineering Resume Evidence (V3)

**Author:** SDE / AI Systems Engineer Candidate  
**Project:** Contexta AI (Production RAG & Document Intelligence Engine)  
**Audit Status:** V3 Canonical Verification Complete  
**Artifact Directory:** `E:\contexta ai\benchmarks\contexta-audit-v3/`  

---

## 3 Defensible Candidate Resume Bullets

### Bullet 1: High-Throughput Caching & Backend Concurrency
> **"Architected an in-memory document caching layer in TypeScript/Express that eliminated synchronous disk I/O, scaling cached vector query throughput to 779 req/sec (P50: 10.6ms, P95: 20.9ms at C=10) with 0.00% error rate across 1,150 load-test requests."**

- **Metric Claimed:** 779.14 RPS at Concurrency 10, P50 of 10.64ms, 0.00% error rate across 1,150 requests.
- **Source Artifact:** [`load_test_results.csv`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v3/load_test_results.csv), [`server.ts`](file:///E:/contexta%20ai/server.ts) (lines 378, 1003).
- **Verification Status:** `VERIFIED`.
- **Why It Matters:** Demonstrates understanding of Node.js event-loop I/O bottlenecks. Sync filesystem operations (`fs.readFileSync`) block the single-threaded event loop; caching index and chunk structures in a hash map allows near-wire-speed in-memory vector dot-product execution.
- **Interviewer Caution / Follow-up:** An interviewer will ask: *"Does this throughput include LLM generation?"*  
  **Honest Answer:** *"No. This benchmarks the complete cached search and retrieval pipeline through Express, vector cosine matching, sufficiency gating, and deduplication. External LLM generation is bound by provider network and model latency (typically 800–1,500ms)."*
- **Fallback Wording (No Numbers):**  
  > *"Architected an in-memory document caching layer in TypeScript that eliminated synchronous disk reads, reducing query latency and supporting zero-error concurrent access under load."*

---

### Bullet 2: Rigorous RAG Evaluation & Sufficiency Gating Trade-Offs
> **"Engineered an automated 100-question RAG evaluation harness analyzing population Recall@5 (69.2% overall, 93.8% on answered queries); implemented morphological token-stem gating that suppressed 48.6% of unanswerable probes while identifying a 26.2% false-abstention penalty."**

- **Metric Claimed:** Population Recall@5 = 69.2% (45/65), Conditioned Recall@5 = 93.8% (45/48), Unanswerable Abstention = 48.6% (17/35), False Abstention = 26.2% (17/65).
- **Source Artifact:** [`retrieval_evaluation.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v3/retrieval_evaluation.json), [`eval_rag_v3.ts`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v3/scripts/eval_rag_v3.ts).
- **Verification Status:** `VERIFIED`.
- **Why It Matters:** Shows true senior engineering maturity: understanding the precision-recall trade-off between hallucination suppression and coverage. Most junior candidates blindly report 100% recall on narrow datasets without evaluating false abstentions.
- **Interviewer Caution / Follow-up:** An interviewer will ask: *"Why did the unanswerable abstention rate stay at 48.6% instead of 100%?"*  
  **Honest Answer:** *"Because offline hashed vector representations suffer semantic bleed on adversarial queries that share technical subterms (e.g. 'GPT-4 Mixture of Experts feed-forward layers' asked against an attention paper). Increasing lexical thresholds higher catches those probes but spikes false abstentions on genuine paraphrased queries above 40%."*
- **Fallback Wording (No Numbers):**  
  > *"Engineered an automated 100-question RAG evaluation harness to evaluate precision-recall trade-offs, implementing lexical sufficiency gating to suppress unsupported answers while measuring false-abstention impacts."*

---

### Bullet 3: Claim-Level Citation Verification & Web Security Hardening
> **"Built an automated claim-level citation verifier proving 72.9% strict precision across 48 citations (identifying a 27.1% adjacent-page citation drift); hardened REST endpoints against directory traversal via boundary regex validation and DOMPurify sanitization."**

- **Metric Claimed:** 72.9% strict citation precision (35/48), 27.1% unsupported citation rate, 100% path traversal rejection (HTTP 400).
- **Source Artifact:** [`citation_evaluation.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v3/citation_evaluation.json), [`security_results.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v3/security_results.json), [`server.ts`](file:///E:/contexta%20ai/server.ts) (line 41).
- **Verification Status:** `VERIFIED`.
- **Why It Matters:** Distinguishes between shallow validation (checking if page number is $\le 15$) and true factual entailment (checking whether the cited page supports the specific claim). Also demonstrates defensive web application security.
- **Interviewer Caution / Follow-up:** An interviewer will ask: *"What caused the 27.1% unsupported citation rate?"*  
  **Honest Answer:** *"The model frequently cited an adjacent page (e.g. Page 2 instead of Page 3) that discussed the same general architecture section but lacked the specific mathematical formula claimed in the sentence."*
- **Fallback Wording (No Numbers):**  
  > *"Built an automated citation verification pipeline checking factual entailment between generated claims and source pages, and hardened API routes against directory traversal attacks."*

---

## Technical Audit of Rejected Claims

To protect the candidate during technical interviews, the following claims from previous audits are explicitly **REJECTED** and must not be used on a resume or portfolio:

| Rejected Claim | Reason for Rejection | What Happened |
| :--- | :--- | :--- |
| **"93.6% Citation Precision"** | Contradicted by raw data | The actual raw JSON recorded 35 valid citations out of 48 evaluated (**72.9%**). The 93.6% figure was an unverified manual error in the V2 report draft. |
| **"0% Fabricated Citations"** | Misleading definition | The V1 test defined "fabricated" solely as whether the cited page was $<1$ or $>15$. In reality, 27.1% of citations cited pages that did not support the factual claim. |
| **"Zero Hallucinations"** | Factually untrue | 18 out of 35 negative probes (51.4%) returned document passages and generated answers on topics absent from the document. |
| **"Zero Memory Leaks"** | Scientifically invalid | A 17-second burst test cannot prove the absence of long-term memory leaks. It only proves short-term bounded heap allocations. |
| **"Hybrid BM25 and Neural Reranking"** | Architectural exaggeration | The codebase does not implement BM25 or cross-encoder rerankers; it implements dense vector cosine search with lexical coverage gating and word-set deduplication. |
| **"42% Latency Drop from Optimization"** | Incomparable test harnesses | V1 compared sequential single requests (`benchmark_api.ts`) against Promise batching (`load_test.ts`), creating an artificial latency drop. |
