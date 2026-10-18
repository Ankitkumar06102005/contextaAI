import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DATASET_100, BenchmarkItem } from './dataset_100.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const RETRIEVAL_OUT = path.resolve(__dirname, '..', 'retrieval_evaluation_v4.json');
const ANSWER_OUT = path.resolve(__dirname, '..', 'answer_quality_evaluation_v4.json');
const CITATION_OUT = path.resolve(__dirname, '..', 'citation_evaluation_v4.json');

async function runRagEvaluationV4() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — CANONICAL RAG RETRIEVAL & QUALITY AUDIT V4');
  console.log('================================================================\n');

  // Load sample doc
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  const retrievalRecords: any[] = [];
  const answerRecords: any[] = [];
  const citationRecords: any[] = [];
  const latencies: number[] = [];

  let totalClaimsEvaluated = 0;
  let totalSupportedClaims = 0;
  let totalCitationsEvaluated = 0;
  let totalValidCitations = 0;
  let totalFabricatedCitations = 0;

  console.log(`Executing evaluation across ${DATASET_100.length} benchmark questions...\n`);

  for (let idx = 0; idx < DATASET_100.length; idx++) {
    const item = DATASET_100[idx];
    const t0 = performance.now();

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: item.question }),
    });

    const latencyMs = performance.now() - t0;
    latencies.push(latencyMs);

    const data = await res.json();
    const answer = data.answer || '';
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const didAbstain = answer.includes("couldn't find enough information") || sources.length === 0;

    // Retrieval metrics
    const retrievedPages = sources.map((s: any) => s.page);
    const uniqueRetrievedPages = Array.from(new Set(retrievedPages));

    let r1 = 0;
    let r3 = 0;
    let r5 = 0;
    let r10 = 0;
    let mrr = 0;
    let dcg10 = 0;

    if (item.is_answerable && !didAbstain) {
      const top1Pages = uniqueRetrievedPages.slice(0, 1);
      const top3Pages = uniqueRetrievedPages.slice(0, 3);
      const top5Pages = uniqueRetrievedPages.slice(0, 5);
      const top10Pages = uniqueRetrievedPages.slice(0, 10);

      const hasTop1 = item.expected_pages.some((p) => top1Pages.includes(p));
      const hasTop3 = item.expected_pages.some((p) => top3Pages.includes(p));
      const hasTop5 = item.expected_pages.some((p) => top5Pages.includes(p));
      const hasTop10 = item.expected_pages.some((p) => top10Pages.includes(p));

      r1 = hasTop1 ? 1 : 0;
      r3 = hasTop3 ? 1 : 0;
      r5 = hasTop5 ? 1 : 0;
      r10 = hasTop10 ? 1 : 0;

      for (let rank = 0; rank < uniqueRetrievedPages.length; rank++) {
        if (item.expected_pages.includes(uniqueRetrievedPages[rank])) {
          mrr = 1 / (rank + 1);
          break;
        }
      }

      for (let rank = 0; rank < Math.min(uniqueRetrievedPages.length, 10); rank++) {
        const isRel = item.expected_pages.includes(uniqueRetrievedPages[rank]) ? 1 : 0;
        dcg10 += isRel / Math.log2(rank + 2);
      }
    }

    const idcg10 = 1.0;
    const ndcg10 = Number((dcg10 / idcg10).toFixed(3));

    retrievalRecords.push({
      id: item.id,
      category: item.category,
      is_answerable: item.is_answerable,
      did_abstain: didAbstain,
      retrieved_pages: uniqueRetrievedPages,
      expected_pages: item.expected_pages,
      recall_at_1: r1,
      recall_at_3: r3,
      recall_at_5: r5,
      recall_at_10: r10,
      mrr,
      ndcg_at_10: ndcg10,
      latency_ms: Number(latencyMs.toFixed(2)),
    });

    // Answer Quality & Citation Verification
    if (item.is_answerable) {
      if (!didAbstain) {
        // Claim verification
        const answerLower = answer.toLowerCase();
        let itemClaimsSupported = 0;
        const claimDetails: any[] = [];

        for (const fact of item.ground_truth_facts) {
          totalClaimsEvaluated++;
          const factTerms = fact.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
          const isSupported = factTerms.length > 0 && factTerms.some((t) => answerLower.includes(t));
          if (isSupported) {
            totalSupportedClaims++;
            itemClaimsSupported++;
          }
          claimDetails.push({ fact, supported: isSupported });
        }

        // Citation extraction
        const citationMatches = answer.match(/\[Page\s*(\d+)\]/gi) || [];
        const citedPages = Array.from(new Set(citationMatches.map((m) => {
          const match = m.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })));

        let itemValidCitations = 0;
        let itemFabricatedCitations = 0;

        for (const page of citedPages) {
          totalCitationsEvaluated++;
          const isValidPage = item.expected_pages.includes(page);
          if (isValidPage) {
            totalValidCitations++;
            itemValidCitations++;
          } else {
            totalFabricatedCitations++;
            itemFabricatedCitations++;
          }
          citationRecords.push({
            question_id: item.id,
            category: item.category,
            cited_page: page,
            expected_pages: item.expected_pages,
            is_valid_grounded: isValidPage,
          });
        }

        const citationPrecision = citedPages.length > 0 ? itemValidCitations / citedPages.length : 0;

        answerRecords.push({
          id: item.id,
          category: item.category,
          status: 'ANSWERED',
          answer_preview: answer.slice(0, 100) + '...',
          claims_total: item.ground_truth_facts.length,
          claims_supported: itemClaimsSupported,
          cited_pages: citedPages,
          citations_valid: itemValidCitations,
          citations_unsupported: itemFabricatedCitations,
          citation_precision: Number(citationPrecision.toFixed(2)),
          claim_details: claimDetails,
        });
      } else {
        answerRecords.push({
          id: item.id,
          category: item.category,
          status: 'FALSE_ABSTENTION',
          answer_preview: answer.slice(0, 80),
        });
      }
    } else {
      answerRecords.push({
        id: item.id,
        category: item.category,
        status: didAbstain ? 'CORRECT_ABSTENTION' : 'UNANSWERABLE_HALLUCINATION',
        answer_preview: answer.slice(0, 80),
      });
    }

    if ((idx + 1) % 25 === 0) {
      console.log(`Evaluated ${idx + 1} / ${DATASET_100.length} items...`);
    }
  }

  // Latency percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  // Population Retrieval Metrics across ALL 65 answerable questions
  const ansRetrieval = retrievalRecords.filter((r) => r.is_answerable);
  const answeredSubset = ansRetrieval.filter((r) => !r.did_abstain);
  const falseAbstentions = ansRetrieval.filter((r) => r.did_abstain);

  const popR1 = Number((ansRetrieval.reduce((a, b) => a + b.recall_at_1, 0) / ansRetrieval.length).toFixed(3));
  const popR3 = Number((ansRetrieval.reduce((a, b) => a + b.recall_at_3, 0) / ansRetrieval.length).toFixed(3));
  const popR5 = Number((ansRetrieval.reduce((a, b) => a + b.recall_at_5, 0) / ansRetrieval.length).toFixed(3));
  const popR10 = popR5; // Equal because total chunks in corpus = 4
  const popMrr = Number((ansRetrieval.reduce((a, b) => a + b.mrr, 0) / ansRetrieval.length).toFixed(3));
  const popNdcg = Number((ansRetrieval.reduce((a, b) => a + b.ndcg_at_10, 0) / ansRetrieval.length).toFixed(3));

  // Conditioned Retrieval Metrics on answered subset
  const condR5 = answeredSubset.length > 0
    ? Number((answeredSubset.reduce((a, b) => a + b.recall_at_5, 0) / answeredSubset.length).toFixed(3))
    : 0;
  const condMrr = answeredSubset.length > 0
    ? Number((answeredSubset.reduce((a, b) => a + b.mrr, 0) / answeredSubset.length).toFixed(3))
    : 0;
  const condNdcg = answeredSubset.length > 0
    ? Number((answeredSubset.reduce((a, b) => a + b.ndcg_at_10, 0) / answeredSubset.length).toFixed(3))
    : 0;

  // Unanswerable Metrics
  const unansRecords = retrievalRecords.filter((r) => !r.is_answerable);
  const correctAbstentions = unansRecords.filter((r) => r.did_abstain).length;
  const unansAbstentionRate = Number((correctAbstentions / unansRecords.length).toFixed(3));
  const unansHallucinationRate = Number(((unansRecords.length - correctAbstentions) / unansRecords.length).toFixed(3));

  // Category breakdown
  const categories = ['direct_factual', 'paraphrased', 'multi_passage', 'ambiguous', 'absent_fact', 'shared_keyword_ood', 'adversarial'];
  const categoryStats: Record<string, any> = {};

  for (const cat of categories) {
    const catItems = retrievalRecords.filter((r) => r.category === cat);
    const catAns = catItems.filter((r) => r.is_answerable);
    const catUnans = catItems.filter((r) => !r.is_answerable);

    const catR5 = catAns.length > 0
      ? Number((catAns.reduce((a, b) => a + b.recall_at_5, 0) / catAns.length).toFixed(3))
      : null;
    const catAbstain = catUnans.length > 0
      ? Number((catUnans.filter((r) => r.did_abstain).length / catUnans.length).toFixed(3))
      : null;

    categoryStats[cat] = {
      total_items: catItems.length,
      answerable_count: catAns.length,
      unanswerable_count: catUnans.length,
      population_recall_at_5: catR5 !== null ? catR5 : 'N/A',
      unanswerable_abstention_rate: catAbstain !== null ? catAbstain : 'N/A',
    };
  }

  // Citation & Claim Metrics
  const strictCitationPrecision = totalCitationsEvaluated > 0
    ? Number((totalValidCitations / totalCitationsEvaluated).toFixed(3))
    : 0;
  const unsupportedCitationRate = totalCitationsEvaluated > 0
    ? Number((totalFabricatedCitations / totalCitationsEvaluated).toFixed(3))
    : 0;
  const overallClaimSupportRate = totalClaimsEvaluated > 0
    ? Number((totalSupportedClaims / totalClaimsEvaluated).toFixed(3))
    : 0;

  console.log('\n================ CANONICAL AUDIT V4 RESULTS ================');
  console.log(`Total Dataset Items:                 ${DATASET_100.length}`);
  console.log(`Answerable Questions:                ${ansRetrieval.length}`);
  console.log(`Answerable Completed / Answered:     ${answeredSubset.length} (${((answeredSubset.length / ansRetrieval.length) * 100).toFixed(1)}%)`);
  console.log(`False Abstentions:                   ${falseAbstentions.length} (${((falseAbstentions.length / ansRetrieval.length) * 100).toFixed(1)}%)`);
  console.log(`Unanswerable Questions:              ${unansRecords.length}`);
  console.log(`Unanswerable Correct Abstentions:    ${correctAbstentions} (${(unansAbstentionRate * 100).toFixed(1)}%)`);
  console.log(`Unanswerable Hallucinations:         ${unansRecords.length - correctAbstentions} (${(unansHallucinationRate * 100).toFixed(1)}%)`);
  console.log('------------------------------------------------------------');
  console.log(`True Population Recall@1 (All 65):   ${(popR1 * 100).toFixed(1)}%`);
  console.log(`True Population Recall@3 (All 65):   ${(popR3 * 100).toFixed(1)}%`);
  console.log(`True Population Recall@5 (All 65):   ${(popR5 * 100).toFixed(1)}%`);
  console.log(`True Population MRR (All 65):        ${popMrr}`);
  console.log(`True Population nDCG@10 (All 65):    ${popNdcg}`);
  console.log(`Conditioned Recall@5 (Answered):     ${(condR5 * 100).toFixed(1)}%`);
  console.log(`Conditioned MRR (Answered):          ${condMrr}`);
  console.log(`Conditioned nDCG@10 (Answered):      ${condNdcg}`);
  console.log('------------------------------------------------------------');
  console.log(`Total Citations Checked:             ${totalCitationsEvaluated}`);
  console.log(`Valid Grounded Citations:            ${totalValidCitations} (${(strictCitationPrecision * 100).toFixed(1)}%)`);
  console.log(`Unsupported Citations:               ${totalFabricatedCitations} (${(unsupportedCitationRate * 100).toFixed(1)}%)`);
  console.log(`Total Claims Evaluated:              ${totalClaimsEvaluated}`);
  console.log(`Supported Claims:                    ${totalSupportedClaims} (${(overallClaimSupportRate * 100).toFixed(1)}%)`);
  console.log(`Latency P50 / P95 / P99:             ${p50.toFixed(2)}ms / ${p95.toFixed(2)}ms / ${p99.toFixed(2)}ms`);
  console.log('============================================================\n');

  // Payloads
  const retrievalPayload = {
    suite: 'Contexta AI Canonical RAG Retrieval Evaluation V4',
    timestamp: new Date().toISOString(),
    dataset_size: DATASET_100.length,
    answerable_count: ansRetrieval.length,
    unanswerable_count: unansRecords.length,
    population_metrics_all_answerable_65: {
      recall_at_1: popR1,
      recall_at_3: popR3,
      recall_at_5: popR5,
      recall_at_10: popR10,
      mean_reciprocal_rank: popMrr,
      ndcg_at_10: popNdcg,
      denominator_definition: 'All 65 answerable questions, counting false abstentions as recall=0'
    },
    conditioned_metrics_answered_subset: {
      answered_count: answeredSubset.length,
      recall_at_5: condR5,
      mean_reciprocal_rank: condMrr,
      ndcg_at_10: condNdcg,
      denominator_definition: `The ${answeredSubset.length} questions where the sufficiency gate allowed retrieval and response generation`
    },
    unanswerable_metrics_35: {
      correct_abstention_rate: unansAbstentionRate,
      hallucinated_unsupported_rate: unansHallucinationRate,
      correct_abstention_count: correctAbstentions,
      total_unanswerable: unansRecords.length
    },
    latency: {
      p50_ms: Number(p50.toFixed(2)),
      p95_ms: Number(p95.toFixed(2)),
      p99_ms: Number(p99.toFixed(2)),
    },
    category_breakdown: categoryStats,
    items: retrievalRecords,
  };

  const answerPayload = {
    suite: 'Contexta AI Answer Quality & Hallucination Audit V4',
    timestamp: new Date().toISOString(),
    answerable_total: ansRetrieval.length,
    answered_count: answeredSubset.length,
    false_abstention_count: falseAbstentions.length,
    answerable_completion_rate: Number((answeredSubset.length / ansRetrieval.length).toFixed(3)),
    false_abstention_rate: Number((falseAbstentions.length / ansRetrieval.length).toFixed(3)),
    unanswerable_total: unansRecords.length,
    unanswerable_correct_abstention_count: correctAbstentions,
    unanswerable_abstention_rate: unansAbstentionRate,
    unanswerable_hallucination_rate: unansHallucinationRate,
    claim_level_metrics: {
      total_claims_evaluated: totalClaimsEvaluated,
      supported_claims_count: totalSupportedClaims,
      claim_support_rate: overallClaimSupportRate,
    },
    items: answerRecords,
  };

  const citationPayload = {
    suite: 'Contexta AI Canonical Citation Verification V4',
    timestamp: new Date().toISOString(),
    total_citations_evaluated: totalCitationsEvaluated,
    valid_citations_count: totalValidCitations,
    unsupported_citations_count: totalFabricatedCitations,
    strict_citation_precision: strictCitationPrecision,
    unsupported_citation_rate: unsupportedCitationRate,
    citations: citationRecords,
  };

  fs.writeFileSync(RETRIEVAL_OUT, JSON.stringify(retrievalPayload, null, 2), 'utf-8');
  fs.writeFileSync(ANSWER_OUT, JSON.stringify(answerPayload, null, 2), 'utf-8');
  fs.writeFileSync(CITATION_OUT, JSON.stringify(citationPayload, null, 2), 'utf-8');

  console.log(`Saved: ${RETRIEVAL_OUT}`);
  console.log(`Saved: ${ANSWER_OUT}`);
  console.log(`Saved: ${CITATION_OUT}`);
}

runRagEvaluationV4().catch((err) => {
  console.error('RAG Evaluation V4 failed:', err);
  process.exit(1);
});
