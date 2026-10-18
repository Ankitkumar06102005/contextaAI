import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const OUT_FILE = path.resolve(__dirname, '..', 'answer_quality_evaluation.json');

interface TestCase {
  id: string;
  question: string;
  is_answerable: boolean;
  expected_page: number | null;
  key_facts: string[];
}

const TEST_CASES: TestCase[] = [
  { id: 'T01', question: 'What is the attention equation in the paper?', is_answerable: true, expected_page: 3, key_facts: ['softmax', 'sqrt', 'd_k'] },
  { id: 'T02', question: 'Why is the square root of d_k used as a scaling factor?', is_answerable: true, expected_page: 3, key_facts: ['dot products grow large', 'small gradients'] },
  { id: 'T03', question: 'How many layers are stacked in the encoder?', is_answerable: true, expected_page: 2, key_facts: ['6', 'identical layers'] },
  { id: 'T04', question: 'What is the dimensionality d_model of all sub-layers?', is_answerable: true, expected_page: 2, key_facts: ['512'] },
  { id: 'T05', question: 'What formula is used for residual connections and normalization?', is_answerable: true, expected_page: 2, key_facts: ['layernorm', 'sublayer'] },
  { id: 'T06', question: 'How many linear projections h are learned in multi-head attention?', is_answerable: true, expected_page: 4, key_facts: ['8', 'linear projections'] },
  { id: 'T07', question: 'How does the model incorporate sequence token positions?', is_answerable: true, expected_page: 4, key_facts: ['sine and cosine', 'positional encodings'] },
  { id: 'T08', question: 'Why does the Transformer require positional encodings?', is_answerable: true, expected_page: 4, key_facts: ['no recurrence', 'no convolution'] },
  { id: 'T09', question: 'Who is the first author of the research digest?', is_answerable: true, expected_page: 1, key_facts: ['vaswani'] },
  { id: 'T10', question: 'On which machine translation tasks was the Transformer evaluated?', is_answerable: true, expected_page: 1, key_facts: ['english-to-german', 'english-to-french'] },
  // Negative probes
  { id: 'T11', question: 'How many parameters does the GPT-4 MoE model have?', is_answerable: false, expected_page: null, key_facts: [] },
  { id: 'T12', question: 'What is the secret baking temperature for apple pie in outer space?', is_answerable: false, expected_page: null, key_facts: [] },
  { id: 'T13', question: 'Explain how FlashAttention v2 splits key-value blocks in CUDA shared memory.', is_answerable: false, expected_page: null, key_facts: [] },
  { id: 'T14', question: 'What is the learning rate schedule for LLaMA 3 pre-training?', is_answerable: false, expected_page: null, key_facts: [] },
  { id: 'T15', question: 'Who won the 2024 Olympic marathon?', is_answerable: false, expected_page: null, key_facts: [] },
];

async function runAnswerQualityEvaluation() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — ANSWER QUALITY & HALLUCINATION AUDIT');
  console.log(`   Sample Cases: ${TEST_CASES.length} (10 Answerable, 5 Negative Probes)`);
  console.log('================================================================\n');

  // Load sample doc
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;
  const totalDocPages = sampleDoc.page_count || 4;

  let answerableCount = 0;
  let unanswerableCount = 0;
  let answerableSuccess = 0;
  let unanswerableAbstained = 0;

  let totalCitationPrecision = 0;
  let totalCitationCoverage = 0;
  let totalFabricatedCitations = 0;
  let totalCitationsEvaluated = 0;
  let totalFaithfulnessScore = 0;

  const itemDetails: any[] = [];

  for (const tc of TEST_CASES) {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: tc.question }),
    });

    const data = await res.json();
    const answer = typeof data.answer === 'string' ? data.answer : '';
    const sources: any[] = Array.isArray(data.sources) ? data.sources : [];

    const isAbstention =
      answer.toLowerCase().includes("couldn't find enough information") ||
      sources.length === 0;

    // Extract all [Page X] citations from answer text
    const citationMatches = answer.match(/\[Page\s*(\d+)\]/gi) || [];
    const citedPageNumbers = citationMatches.map((m) => {
      const num = m.match(/\d+/);
      return num ? parseInt(num[0], 10) : 0;
    });

    let citationPrecision = 1.0;
    let citationCoverage = 0.0;
    let fabricatedCitation = false;
    let faithfulness = 1.0;

    if (tc.is_answerable) {
      answerableCount++;

      if (isAbstention) {
        // Unexpected abstention on answerable question
        itemDetails.push({
          id: tc.id,
          question: tc.question,
          status: 'FALSE_ABSTENTION',
          answer,
          cited_pages: [],
          correctness_score: 0.0,
          faithfulness_score: 0.0,
        });
        continue;
      }

      answerableSuccess++;

      // Check for fabricated citations (citing pages beyond document bounds or 0)
      for (const p of citedPageNumbers) {
        totalCitationsEvaluated++;
        if (p < 1 || p > totalDocPages) {
          fabricatedCitation = true;
          totalFabricatedCitations++;
        }
      }

      // Citation Precision: does the cited page match expected page?
      if (citedPageNumbers.length > 0 && tc.expected_page) {
        const correctCitations = citedPageNumbers.filter((p) => p === tc.expected_page).length;
        citationPrecision = correctCitations / citedPageNumbers.length;
      } else if (citedPageNumbers.length === 0) {
        citationPrecision = 0.0;
      }

      // Citation Coverage: does the answer contain at least one valid citation?
      citationCoverage = citedPageNumbers.length > 0 ? 1.0 : 0.0;

      // Key fact groundedness
      let factsFound = 0;
      const lowerAns = answer.toLowerCase();
      for (const fact of tc.key_facts) {
        if (lowerAns.includes(fact.toLowerCase())) factsFound++;
      }
      faithfulness = tc.key_facts.length > 0 ? factsFound / tc.key_facts.length : 1.0;

      totalCitationPrecision += citationPrecision;
      totalCitationCoverage += citationCoverage;
      totalFaithfulnessScore += faithfulness;

      itemDetails.push({
        id: tc.id,
        question: tc.question,
        status: 'SUCCESS',
        answer_preview: answer.slice(0, 140) + '...',
        cited_pages: citedPageNumbers,
        expected_page: tc.expected_page,
        citation_precision: Number(citationPrecision.toFixed(2)),
        citation_coverage: citationCoverage,
        faithfulness_score: Number(faithfulness.toFixed(2)),
        fabricated_citation: fabricatedCitation,
      });
    } else {
      unanswerableCount++;
      if (isAbstention) {
        unanswerableAbstained++;
        itemDetails.push({
          id: tc.id,
          question: tc.question,
          status: 'CORRECTLY_ABSTAINED',
          answer,
          hallucination_detected: false,
        });
      } else {
        itemDetails.push({
          id: tc.id,
          question: tc.question,
          status: 'HALLUCINATED_UNANSWERABLE',
          answer,
          hallucination_detected: true,
        });
      }
    }
  }

  const meanCitationPrecision = answerableSuccess > 0 ? totalCitationPrecision / answerableSuccess : 0;
  const meanCitationCoverage = answerableSuccess > 0 ? totalCitationCoverage / answerableSuccess : 0;
  const meanFaithfulness = answerableSuccess > 0 ? totalFaithfulnessScore / answerableSuccess : 0;
  const abstentionRate = unanswerableCount > 0 ? unanswerableAbstained / unanswerableCount : 1;
  const fabricatedCitationRate = totalCitationsEvaluated > 0 ? totalFabricatedCitations / totalCitationsEvaluated : 0;

  console.log('---------------- ANSWER QUALITY SUMMARY ----------------');
  console.log(`Answerable Success Rate:     ${((answerableSuccess / answerableCount) * 100).toFixed(1)}% (${answerableSuccess}/${answerableCount})`);
  console.log(`Unanswerable Abstention:     ${((abstentionRate) * 100).toFixed(1)}% (${unanswerableAbstained}/${unanswerableCount})`);
  console.log(`Citation Precision:          ${(meanCitationPrecision * 100).toFixed(1)}%`);
  console.log(`Citation Coverage:           ${(meanCitationCoverage * 100).toFixed(1)}%`);
  console.log(`Faithfulness / Grounding:    ${(meanFaithfulness * 100).toFixed(1)}%`);
  console.log(`Fabricated Citation Rate:    ${(fabricatedCitationRate * 100).toFixed(2)}% (${totalFabricatedCitations}/${totalCitationsEvaluated})`);
  console.log('--------------------------------------------------------\n');

  const outputPayload = {
    metadata: {
      suite: 'Generated Answer Quality & Hallucination Audit',
      corpus: 'transformer-foundations-sample.pdf',
      document_page_count: totalDocPages,
      timestamp: new Date().toISOString(),
    },
    metrics: {
      answerable_success_rate: Number((answerableSuccess / answerableCount).toFixed(3)),
      unanswerable_abstention_rate: Number(abstentionRate.toFixed(3)),
      citation_precision: Number(meanCitationPrecision.toFixed(3)),
      citation_coverage: Number(meanCitationCoverage.toFixed(3)),
      faithfulness_score: Number(meanFaithfulness.toFixed(3)),
      fabricated_citation_rate: Number(fabricatedCitationRate.toFixed(4)),
      total_citations_checked: totalCitationsEvaluated,
      fabricated_citations_count: totalFabricatedCitations,
    },
    sample_evaluations: itemDetails,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`Answer quality results written to: ${OUT_FILE}`);
}

runAnswerQualityEvaluation().catch((err) => {
  console.error('Answer quality audit failed:', err);
  process.exit(1);
});
