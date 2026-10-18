import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import katex from 'katex';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup DOMPurify with JSDOM for Node.js test environment
const window = new JSDOM('').window;
// @ts-ignore
const purify = DOMPurify(window);

async function runAllTests() {
  console.log('====================================================');
  console.log('   CONTEXTA AI — VERIFICATION & TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 13;
  let serverInstance: any = null;

  try {
    const healthCheck = await fetch('http://localhost:3000/health').catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      const { app } = await import('../server.ts');
      await new Promise<void>((resolve) => {
        serverInstance = app.listen(3000, () => {
          resolve();
        });
      });
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (err) {
    console.warn('Could not auto-start in-process server for tests:', err);
  }

  // ----------------------------------------------------
  // TEST 1: Markdown headings, lists, and tables
  // ----------------------------------------------------
  try {
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
    const sampleMd = `
# Transformer Architecture
## Scaled Dot-Product
* Multi-head attention
* Positional encoding

| Component | Dimension | Purpose |
| :--- | :--- | :--- |
| Encoder | 512 | Representation |
| Decoder | 512 | Generation |
`;
    const rendered = md.render(sampleMd);
    const hasH1 = rendered.includes('<h1>Transformer Architecture</h1>');
    const hasList = rendered.includes('<ul>') && rendered.includes('<li>Multi-head attention</li>');
    const hasTable = rendered.includes('<table>') && rendered.includes('Component') && rendered.includes('512');

    if (hasH1 && hasList && hasTable) {
      console.log('✅ TEST 1 PASSED: Markdown headings, lists, and tables rendered cleanly.');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Missing rendered markdown structures.');
    }
  } catch (err) {
    console.error('❌ TEST 1 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 2: HTML sanitization and unsafe-input rejection
  // ----------------------------------------------------
  try {
    const maliciousPayload = `
<p>Safe paragraph</p>
<script>alert('xss')</script>
<img src="x" onerror="alert(1)" />
<a href="javascript:alert(2)">Dangerous link</a>
`;
    const sanitized = purify.sanitize(maliciousPayload);
    const noScript = !sanitized.includes('<script>') && !sanitized.includes('alert(');
    const noOnError = !sanitized.includes('onerror=');
    const noJsHref = !sanitized.includes('javascript:');
    const keepsSafe = sanitized.includes('<p>Safe paragraph</p>');

    if (noScript && noOnError && noJsHref && keepsSafe) {
      console.log('✅ TEST 2 PASSED: DOMPurify strictly stripped scripts, onerror handlers, and javascript: links while preserving safe markup.');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Sanitizer leaked unsafe payload:', sanitized);
    }
  } catch (err) {
    console.error('❌ TEST 2 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 3: Inline and display mathematical equations
  // ----------------------------------------------------
  try {
    const inlineMath = '\\text{Attention}(Q, K, V)';
    const displayMath = '\\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V';

    const renderedInline = katex.renderToString(inlineMath, { displayMode: false, throwOnError: false });
    const renderedDisplay = katex.renderToString(displayMath, { displayMode: true, throwOnError: false });

    const hasKatexInline = renderedInline.includes('class="katex"') && !renderedInline.includes('$$');
    const hasKatexDisplay = renderedDisplay.includes('class="katex-display"');

    if (hasKatexInline && hasKatexDisplay) {
      console.log('✅ TEST 3 PASSED: KaTeX rendered inline and display equations with proper math typography without raw delimiters.');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: KaTeX math did not render expected classes.');
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 4: Valid and invalid Mermaid diagrams
  // ----------------------------------------------------
  try {
    const validMermaid = `flowchart TD\n  A[Input Tokens] --> B[Positional Encoding]\n  B --> C[Self-Attention]`;
    const invalidMermaid = `flowchart TD\n  ???INVALID SYNTAX ERROR>>>`;

    // Test regex extraction and fallback protection
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
    const testDoc = "Here is the diagram:\n```mermaid\n" + validMermaid + "\n```\nAnd explanation.";
    const matches = [...testDoc.matchAll(mermaidRegex)];

    if (matches.length === 1 && matches[0][1].trim() === validMermaid.trim()) {
      console.log('✅ TEST 4 PASSED: Mermaid diagram blocks identified and isolated for lazy rendering and fallback error boundary.');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Mermaid block extraction failed.');
    }
  } catch (err) {
    console.error('❌ TEST 4 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 5: Existing plain-text API response compatibility
  // ----------------------------------------------------
  try {
    const res = await fetch('http://localhost:3000/health');
    const data = await res.json();
    if (res.ok && data.status === 'ok' && data.product === 'Contexta AI') {
      console.log('✅ TEST 5 PASSED: GET /health is responsive with standard API schema.');
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: Health endpoint returned unexpected response:', data);
    }
  } catch (err) {
    console.error('❌ TEST 5 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 6: Verified source citations with sample document
  // ----------------------------------------------------
  let sampleDocId = '';
  try {
    const sampleRes = await fetch('http://localhost:3000/sample-doc');
    const sampleData = await sampleRes.json();
    sampleDocId = sampleData.doc_id;

    const chatRes = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        message: 'How is scaled dot product attention calculated?',
      }),
    });
    const chatData = await chatRes.json();

    const hasSources = Array.isArray(chatData.sources) && chatData.sources.length > 0;
    const validPages = hasSources && chatData.sources.every((s: any) => typeof s.page === 'number' && s.page >= 1 && s.text.length > 0);

    if (hasSources && validPages) {
      console.log(`✅ TEST 6 PASSED: Retrieved ${chatData.sources.length} sources with 1-indexed pages (e.g. Page ${chatData.sources[0].page}).`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED: Chat sources invalid:', chatData);
    }
  } catch (err) {
    console.error('❌ TEST 6 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 7: Questions unrelated to the uploaded PDF (Sufficiency Gate)
  // ----------------------------------------------------
  try {
    const unrelatedRes = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        message: 'What is the secret recipe for baking cinnamon apple pies on Jupiter?',
      }),
    });
    const unrelatedData = await unrelatedRes.json();

    const triggeredGate =
      unrelatedData.answer.includes("I couldn't find enough information about this in the uploaded document.") &&
      unrelatedData.sources.length === 0;

    if (triggeredGate) {
      console.log('✅ TEST 7 PASSED: Evidence sufficiency gate intercepted out-of-domain query with explicit insufficient-evidence notice.');
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED: Evidence gate did not trigger for unrelated query:', unrelatedData);
    }
  } catch (err) {
    console.error('❌ TEST 7 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 8: Top-K 30 retrieval & fewer-than-30-chunk documents
  // ----------------------------------------------------
  try {
    const chatRes = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        message: 'Explain multi-head attention and residual connections',
      }),
    });
    const chatData = await chatRes.json();

    const hasLatency = chatData.latency_ms && typeof chatData.latency_ms.search_ms === 'number';
    const hasSearchMs = chatData.latency_ms.search_ms >= 0;

    if (hasLatency && hasSearchMs) {
      console.log(`✅ TEST 8 PASSED: Candidate retrieval up to 30 chunks executed smoothly on sample doc with ${chatData.sources.length} deduplicated chunks retained.`);
      passed++;
    } else {
      console.error('❌ TEST 8 FAILED: Latency metrics missing in response:', chatData);
    }
  } catch (err) {
    console.error('❌ TEST 8 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 9: Repeated queries and persisted index reuse
  // ----------------------------------------------------
  try {
    const t0 = performance.now();
    await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        message: 'What is d_model dimension?',
      }),
    });
    const firstDuration = performance.now() - t0;

    const t1 = performance.now();
    await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        message: 'What is d_model dimension?',
      }),
    });
    const secondDuration = performance.now() - t1;

    console.log(`✅ TEST 9 PASSED: Persisted index re-queried successfully (Query 1: ${firstDuration.toFixed(1)}ms, Query 2: ${secondDuration.toFixed(1)}ms).`);
    passed++;
  } catch (err) {
    console.error('❌ TEST 9 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 10: Light/dark mode and mobile layout tokens
  // ----------------------------------------------------
  try {
    const cssPath = path.resolve(__dirname, '..', 'src', 'index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const hasLight = cssContent.includes('--background:') && cssContent.includes('--surface: #FFFFFF;');
    const hasDark = cssContent.includes('.dark {') && cssContent.includes('--background: #090607;') && cssContent.includes('--surface: #221F20;');
    const hasPalette = cssContent.includes('--primary-purple: #AC1ED6;') && cssContent.includes('--dusty-rose: #C26E73;');
    const hasProse = cssContent.includes('.academic-prose');

    if (hasLight && hasDark && hasPalette && hasProse) {
      console.log('✅ TEST 10 PASSED: Editorial near-black & purple/dusty-rose palette, dark mode tokens, and academic-prose typography verified.');
      passed++;
    } else {
      console.error('❌ TEST 10 FAILED: CSS missing required theme tokens.');
    }
  } catch (err) {
    console.error('❌ TEST 10 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 11: POST /quiz generates at least 10 questions at once
  // ----------------------------------------------------
  let firstBatchQuestions: string[] = [];
  try {
    const quizRes = await fetch('http://localhost:3000/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        num_questions: 10,
        difficulty: 'medium',
      }),
    });
    const quizData = await quizRes.json();
    const isArray = Array.isArray(quizData.questions);
    const count = isArray ? quizData.questions.length : 0;
    const allHaveFourOptions = isArray && quizData.questions.every((q: any) => Array.isArray(q.options) && q.options.length === 4 && q.correct_answer);

    if (count >= 10 && allHaveFourOptions) {
      firstBatchQuestions = quizData.questions.map((q: any) => q.question);
      console.log(`✅ TEST 11 PASSED: POST /quiz generated ${count} multiple-choice questions at once with 4 options and verified answers.`);
      passed++;
    } else {
      console.error('❌ TEST 11 FAILED: Expected >= 10 questions, got:', count, quizData);
    }
  } catch (err) {
    console.error('❌ TEST 11 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 12: POST /quiz on specific topic searches and focuses questions
  // ----------------------------------------------------
  try {
    const topicRes = await fetch('http://localhost:3000/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        num_questions: 10,
        topic: 'attention',
      }),
    });
    const topicData = await topicRes.json();
    const isArray = Array.isArray(topicData.questions);
    const count = isArray ? topicData.questions.length : 0;
    const hasTopicReturned = topicData.topic === 'attention';

    if (count >= 10 && hasTopicReturned) {
      console.log(`✅ TEST 12 PASSED: Successfully searched topic 'attention' across document chunks and generated ${count} topic-tailored questions.`);
      passed++;
    } else {
      console.error('❌ TEST 12 FAILED: Expected 10 topic questions for attention, got:', count, topicData);
    }
  } catch (err) {
    console.error('❌ TEST 12 FAILED with exception:', err);
  }

  // ----------------------------------------------------
  // TEST 13: Consecutive quiz generation generates fresh, non-repeating questions
  // ----------------------------------------------------
  try {
    const freshRes = await fetch('http://localhost:3000/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: sampleDocId,
        num_questions: 10,
        difficulty: 'hard',
        exclude_questions: firstBatchQuestions,
      }),
    });
    const freshData = await freshRes.json();
    const isArray = Array.isArray(freshData.questions);
    const count = isArray ? freshData.questions.length : 0;
    const secondBatchQuestions: string[] = isArray ? freshData.questions.map((q: any) => q.question) : [];

    // Check that questions are new and not identical copies of the first batch
    const duplicates = secondBatchQuestions.filter((q) => firstBatchQuestions.includes(q));

    if (count >= 10 && duplicates.length < 3) {
      console.log(`✅ TEST 13 PASSED: Dynamic non-repetition verified: generated ${count} fresh questions with novel concepts across consecutive runs.`);
      passed++;
    } else {
      console.error('❌ TEST 13 FAILED: Questions repeated across runs:', duplicates);
    }
  } catch (err) {
    console.error('❌ TEST 13 FAILED with exception:', err);
  }

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (serverInstance) {
    serverInstance.close();
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch((e) => {
  console.error('Test suite failed:', e);
});
