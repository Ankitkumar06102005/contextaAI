# Contexta AI — SDE & AI Engineering Portfolio Evidence

**Author:** SDE / AI Systems Engineer Candidate  
**Project:** Contexta AI (Production RAG & Document Intelligence Engine)  
**Repository:** `E:\contexta ai`  
**Evidence Artifacts:** `E:\contexta ai\benchmarks\contexta-audit-v2\`  

---

## 3 Defensible, Verified Resume Bullets

### Bullet 1: High-Throughput RAG Architecture & In-Memory Caching
> **Architected an in-memory document caching layer in Node.js/TypeScript that eliminated redundant disk I/O, scaling cached hybrid RAG retrieval throughput to 835 req/sec (P50: 23.7ms, P95: 57.1ms at C=25) with 0.00% error rate across 1,000+ load-test requests and zero memory leaks (+0.6MB heap over 500 soak cycles).**

- **The Problem:** Each incoming query synchronously read and deserialized `index.json` and `chunks.json` from the filesystem, causing file descriptor contention, I/O wait, and throughput saturation under concurrent requests.
- **The Solution:** Implemented an LRU-style in-memory document cache with automated invalidation on document deletion (`DELETE /document/:doc_id`) and warm cache population during upload and sample loading.
- **Verification Proof:** Tested across concurrency levels 1, 5, 10, 25, 50. At concurrency 25, throughput peaked at 835.14 RPS with 23.70ms median latency. 500-request sustained soak test demonstrated stable bounded heap (+0.60 MB delta) and zero dropped connections.
- **Artifact:** [`load_test_results_v2.csv`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/load_test_results_v2.csv) & [`resource_soak_results_v2.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/resource_soak_results_v2.json).

---

### Bullet 2: Rigorous RAG Evaluation, Sufficiency Gating & Hallucination Control
> **Engineered a 100-question automated evaluation harness measuring Recall@5 (90.6%), MRR (0.809), and nDCG@10 (0.854); implemented morphological stem normalization and evidence sufficiency gating to balance hallucination suppression (48.6% abstention on unanswerable queries) against false abstentions on paraphrased queries.**

- **The Problem:** Ungated vector retrieval suffered from semantic leakage, retrieving nearest-neighbor passages with 0.28–0.38 cosine similarity even on completely unanswerable negative probes, causing 100% hallucination rate on out-of-scope inputs. However, overly strict keyword gates triggered a 44.6% false-abstention rate on paraphrased queries.
- **The Solution:** Engineered a multi-stage evidence sufficiency gate combining thresholded cosine similarity, query coverage ratios, and token-stem normalization. Evaluated across a 100-question benchmark split into 7 distinct categories (direct factual, paraphrased, multi-passage, ambiguous, absent facts, shared-keyword OOD, and adversarial).
- **Verification Proof:** On 65 answerable queries, achieved 90.6% Recall@5 and 0.809 MRR with 93.8% answer correctness. On 35 negative probes, correctly abstained on 48.6% without returning fabricated context.
- **Artifact:** [`retrieval_evaluation_v2.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/retrieval_evaluation_v2.json) & [`answer_quality_evaluation_v2.json`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/answer_quality_evaluation_v2.json).

---

### Bullet 3: Claim-Level Citation Verification & Web Security Hardening
> **Designed an automated claim-level citation verifier proving 93.6% factual entailment across 94 citations; hardened API against directory traversal via strict identifier sanitization and secured rich rendering using DOMPurify and Mermaid strict sandbox isolation.**

- **The Problem:** The initial audit reported "0% fabricated citations" simply by checking whether page numbers were within valid document bounds ($1 \le \text{page} \le N$), ignoring whether the cited page actually supported the specific factual claim made in the text.
- **The Solution:** Built a factual claim entailment verifier that maps generated assertions to source page content. Additionally implemented a comprehensive security barrier using regex-based document ID validation (`^[a-zA-Z0-9_-]+$`) to prevent path traversal (`..`, `%2e%2e`), DOMPurify HTML sanitization, and Mermaid diagram sandboxing (`securityLevel: 'strict'`).
- **Verification Proof:** Verified 88/94 (93.6%) citations directly entailed the claimed facts. 12/12 security and regression test cases passed 100%, rejecting path traversal payloads across `/chat`, `/quiz`, `/summary`, and `/document` routes.
- **Artifact:** [`verify_security_v2.ts`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/scripts/verify_security_v2.ts) & [`SECOND_PASS_AUDIT.md`](file:///E:/contexta%20ai/benchmarks/contexta-audit-v2/SECOND_PASS_AUDIT.md).

---

## Interview Defense & Technical Trade-Off FAQ

#### Q: "Why does the abstention rate hover around 48.6% instead of 100% on negative queries?"
> **Candidate Answer:** *"In an offline/embedded environment using bag-of-words or hashed embeddings without an expensive neural cross-encoder, negative queries that share vocabulary with the document (such as 'GPT-4 Mixture of Experts feed-forward layers' asked against the original Transformer paper) exhibit lexical overlap with passages describing 'feed-forward layers'. Imposing a strict threshold that catches 100% of these queries causes a severe 44.6% false-abstention penalty on genuine paraphrased questions. I engineered the threshold using an empirical precision-recall curve to optimize answerable Recall@5 (90.6%) while intercepting pure out-of-domain probes."*

#### Q: "Why was the v1 citation score of 0% fabricated citations misleading?"
> **Candidate Answer:** *"The initial test script checked only if the returned page number was between 1 and 15. If the model claimed 'The transformer uses 64 attention heads' and cited Page 3 (which actually states 8 heads), the v1 test labeled it valid because Page 3 exists. In v2, I implemented claim-level verification to check factual entailment between the specific proposition and the page content, yielding an honest, defensible 93.6% precision."*

#### Q: "How does the caching layer handle multi-document concurrency and memory pressure?"
> **Candidate Answer:** *"The cache stores parsed index matrices and text chunk arrays keyed by sanitized docId. Document deletion invalidates cache entries immediately. During a 500-request sustained soak test with mixed operations, server heap growth was bounded to +0.60 MB, confirming that V8 garbage collection efficiently cycles transient buffer allocations."*
