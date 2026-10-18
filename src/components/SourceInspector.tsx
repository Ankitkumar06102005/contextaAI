import React from 'react';
import { FileText, X, ExternalLink, Bookmark, HelpCircle } from 'lucide-react';
import { DocumentInfo, SourceSnippet } from '../types';

interface SourceInspectorProps {
  document: DocumentInfo | null;
  activeSource: SourceSnippet | null;
  isOpen: boolean;
  onClose: () => void;
  onAskAboutSource: (text: string) => void;
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({
  document,
  activeSource,
  isOpen,
  onClose,
  onAskAboutSource,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile/Tablet backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-[90vw] bg-[#FFFFFF] dark:bg-[#221F20] border-l border-[#E5DEE3] dark:border-[#40363E] flex flex-col h-full shadow-2xl lg:shadow-none lg:relative lg:w-80 shrink-0 transition-colors">
        {/* Header */}
      <div className="h-14 px-5 border-b border-[#E5DEE3] dark:border-[#40363E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#AC1ED6] dark:text-[#E6B8F0]" />
          <h3 className="text-xs font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
            Source Passage Inspector
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#72656F] dark:text-[#BEB4BB] hover:text-[#1E181D] dark:hover:text-[#F7F3F6] rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-6">
        {activeSource ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3EEF2] dark:border-[#2B2429]">
              <span className="font-mono-code text-xs font-semibold text-[#AC1ED6] dark:text-[#E6B8F0] bg-[#F3E2F7] dark:bg-[#2B2429] px-2 py-0.5 rounded border border-[#E5DEE3] dark:border-[#40363E]">
                Page {activeSource.page}
              </span>
              <span className="font-mono-code text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
                {activeSource.chunk_id}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#72656F] dark:text-[#BEB4BB] uppercase tracking-wider font-mono-code">
                Verbatim Extracted Passage
              </p>
              <div className="p-4 bg-[#FAF8F9] dark:bg-[#1A1618] border border-[#E5DEE3] dark:border-[#40363E] rounded-xl text-xs text-[#1E181D] dark:text-[#F7F3F6] leading-relaxed whitespace-pre-wrap font-sans-ui">
                {activeSource.text}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() =>
                  onAskAboutSource(
                    `Please explain the following excerpt from Page ${activeSource.page} in detail:\n\n"${activeSource.text.slice(0, 200)}..."`
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-[#AC1ED6] hover:bg-[#9218B5] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Explain this excerpt with Teacher Agent</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F9] dark:bg-[#2B2429] text-[#72656F] dark:text-[#BEB4BB] flex items-center justify-center mx-auto border border-[#E5DEE3] dark:border-[#40363E]">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">
              No passage selected
            </p>
            <p className="text-[11px] text-[#72656F] dark:text-[#BEB4BB] max-w-[200px] mx-auto">
              Click "View passage" under any Teacher or Summary agent citation to inspect original PDF excerpts here.
            </p>
          </div>
        )}

        {/* Document Metadata Summary */}
        {document && (
          <div className="p-4 bg-[#FAF8F9] dark:bg-[#2B2429] rounded-xl border border-[#E5DEE3] dark:border-[#40363E] space-y-2.5 text-xs">
            <p className="font-semibold text-[#1E181D] dark:text-[#F7F3F6] font-epilogue">Document Index Info</p>
            <div className="space-y-1 text-[11px] text-[#72656F] dark:text-[#BEB4BB]">
              <div className="flex justify-between">
                <span>File:</span>
                <span className="font-semibold text-[#1E181D] dark:text-[#F7F3F6] truncate max-w-[140px]">{document.filename}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pages:</span>
                <span className="font-mono-code font-semibold text-[#1E181D] dark:text-[#F7F3F6]">{document.page_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Vector Chunks:</span>
                <span className="font-mono-code font-semibold text-[#1E181D] dark:text-[#F7F3F6]">{document.chunk_count}</span>
              </div>
              <div className="flex justify-between">
                <span>RAG Similarity:</span>
                <span className="font-mono-code font-semibold text-[#AC1ED6] dark:text-[#E6B8F0]">Cosine (FlatIP)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
