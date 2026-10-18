import React, { useEffect, useState, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import katex from 'katex';

interface AcademicRendererProps {
  content: string;
  isDarkMode?: boolean;
}

// Module-level SVG diagram cache
const diagramCache = new Map<string, string>();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

function renderMarkdownAndMath(content: string): { html: string; diagrams: { id: string; code: string; placeholder: string }[] } {
  if (!content) return { html: '', diagrams: [] };

  // 1. Extract Mermaid diagrams before markdown processing
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
  const extractedDiagrams: { id: string; code: string; placeholder: string }[] = [];
  let diagramIndex = 0;

  let processedText = content.replace(mermaidRegex, (_match, code) => {
    const id = `mermaid-diag-${Date.now()}-${diagramIndex++}`;
    const placeholder = `%%MERMAID_DIAGRAM_${id}%%`;
    extractedDiagrams.push({
      id,
      code: code.trim(),
      placeholder,
    });
    return `\n\n${placeholder}\n\n`;
  });

  // 2. Extract KaTeX math blocks and inline math
  const mathBlocks: { id: string; math: string; displayMode: boolean }[] = [];
  let mathIndex = 0;

  // Display math $$ ... $$
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    const id = `%%KATEX_BLOCK_${mathIndex++}%%`;
    mathBlocks.push({ id, math: math.trim(), displayMode: true });
    return id;
  });

  // Inline math $ ... $ (avoiding currency signs or empty $$)
  processedText = processedText.replace(/(^|[^\$])\$([^\$\n]+?)\$(?!\$)/g, (_match, prefix, math) => {
    const id = `%%KATEX_INLINE_${mathIndex++}%%`;
    mathBlocks.push({ id, math: math.trim(), displayMode: false });
    return `${prefix}${id}`;
  });

  // 3. Parse Markdown via markdown-it
  let rawHtml = '';
  try {
    rawHtml = md.render(processedText);
  } catch (err) {
    console.warn('Markdown parsing error:', err);
    rawHtml = `<p>${processedText}</p>`;
  }

  // 4. Re-insert KaTeX rendered equations using callback replacement to prevent $ substitution bugs
  for (const item of mathBlocks) {
    try {
      const renderedMath = katex.renderToString(item.math, {
        displayMode: item.displayMode,
        throwOnError: false,
      });
      rawHtml = rawHtml.replace(item.id, () => renderedMath);
    } catch {
      rawHtml = rawHtml.replace(item.id, () => `<code>${item.math}</code>`);
    }
  }

  // 5. Sanitize HTML
  let sanitized = '';
  try {
    sanitized = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: [
        'svg', 'g', 'path', 'rect', 'circle', 'line', 'polygon', 'polyline',
        'text', 'tspan', 'marker', 'defs', 'foreignObject', 'span', 'div',
      ],
      ADD_ATTR: [
        'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width',
        'stroke-dasharray', 'd', 'transform', 'class', 'style', 'xmlns', 'id', 'aria-hidden', 'role',
      ],
    });
  } catch (sanitizeErr) {
    console.warn('Sanitization fallback:', sanitizeErr);
    sanitized = rawHtml;
  }

  return { html: sanitized, diagrams: extractedDiagrams };
}

export const AcademicRenderer: React.FC<AcademicRendererProps> = ({ content, isDarkMode = false }) => {
  // Determine if dark mode is active from prop, html.dark class, or prefers-color-scheme
  const [effectiveDarkMode, setEffectiveDarkMode] = useState<boolean>(() => {
    if (isDarkMode) return true;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      setEffectiveDarkMode(true);
      return;
    }
    const checkDark = () => {
      const isDarkClass = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      setEffectiveDarkMode(isDarkClass);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, [isDarkMode]);

  // Synchronously compute initial HTML so content renders INSTANTLY on frame 0
  const initialData = useMemo(() => {
    return renderMarkdownAndMath(content);
  }, [content]);

  const [htmlWithDiagrams, setHtmlWithDiagrams] = useState<string>(initialData.html);

  // Update immediately whenever content changes
  useEffect(() => {
    setHtmlWithDiagrams(initialData.html);
  }, [initialData.html]);

  // Asynchronously render any Mermaid diagrams
  useEffect(() => {
    let isCancelled = false;

    async function renderMermaid() {
      if (initialData.diagrams.length === 0) return;

      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: effectiveDarkMode ? 'dark' : 'base',
          themeVariables: effectiveDarkMode
            ? {
                primaryColor: '#232E26',
                primaryBorderColor: '#7CA181',
                primaryTextColor: '#EEF3ED',
                lineColor: '#A8B7AA',
                background: '#1A221C',
                fontSize: '13px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }
            : {
                primaryColor: '#EAF3EA',
                primaryBorderColor: '#739678',
                primaryTextColor: '#202820',
                lineColor: '#34553A',
                background: '#FFFFFF',
                fontSize: '13px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              },
        });

        let updatedHtml = initialData.html;

        for (const diag of initialData.diagrams) {
          const cacheKey = `${diag.code}__${effectiveDarkMode ? 'dark' : 'light'}`;
          if (diagramCache.has(cacheKey)) {
            const cachedSvg = diagramCache.get(cacheKey)!;
            updatedHtml = updatedHtml.replace(
              diag.placeholder,
              () => `<div class="my-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto text-center flex flex-col items-center">${cachedSvg}</div>`
            );
          } else {
            try {
              const isValid = await mermaid.parse(diag.code);
              if (isValid) {
                const uniqueId = `mermaid_svg_${Math.random().toString(36).substring(2, 8)}`;
                const { svg } = await mermaid.render(uniqueId, diag.code);
                diagramCache.set(cacheKey, svg);
                updatedHtml = updatedHtml.replace(
                  diag.placeholder,
                  () => `<div class="my-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto text-center flex flex-col items-center">${svg}</div>`
                );
              } else {
                throw new Error('Mermaid syntax invalid');
              }
            } catch {
              // Fallback block preserving full context
              updatedHtml = updatedHtml.replace(
                diag.placeholder,
                () => `<div class="my-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-xs">
                  <p class="font-semibold text-[var(--text-primary)] mb-1">Architecture Flow Diagram</p>
                  <pre class="overflow-x-auto p-2 bg-[var(--surface)] rounded border border-[var(--border)] text-[11px] font-mono-code">${diag.code}</pre>
                </div>`
              );
            }
          }
        }

        if (!isCancelled) {
          setHtmlWithDiagrams(updatedHtml);
        }
      } catch (err) {
        console.warn('Mermaid load failed, showing fallback code:', err);
      }
    }

    renderMermaid();

    return () => {
      isCancelled = true;
    };
  }, [initialData, effectiveDarkMode]);

  // Clean fallback if for any reason HTML is empty
  if (!htmlWithDiagrams && content) {
    return (
      <div
        className={`academic-prose ${effectiveDarkMode ? 'dark-mode dark' : ''} text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans-ui`}
        style={{ color: effectiveDarkMode ? '#EEF3ED' : '#202820' }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`academic-prose ${effectiveDarkMode ? 'dark-mode dark' : ''} text-xs sm:text-sm leading-relaxed`}
      style={{ color: effectiveDarkMode ? '#EEF3ED' : '#202820' }}
      dangerouslySetInnerHTML={{ __html: htmlWithDiagrams }}
    />
  );
};
