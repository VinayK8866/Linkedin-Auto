import React, { useState } from 'react';
import { Sparkles, Wand2, Shield, PlusCircle, Image as ImageIcon, Eye, X } from 'lucide-react';

interface PostComposerProps {
  formulas: Array<{ id: string; name: string; bestFor: string }>;
  founderAngles: Array<{ id: string; name: string; focus: string }>;
  onAddToQueue: (item: { type: string; title: string; content: string; metadata: any }) => Promise<void>;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  formulas,
  founderAngles,
  onAddToQueue
}) => {
  const [topic, setTopic] = useState('');
  const [selectedFormula, setSelectedFormula] = useState(formulas[0]?.id || 'F7');
  const [selectedAngle, setSelectedAngle] = useState('');
  const [targetLength, setTargetLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [auditScore, setAuditScore] = useState<any>(null);
  const [humanizeReport, setHumanizeReport] = useState<string>('');
  const [quoteCard, setQuoteCard] = useState<{ imageUrl: string; filename: string; pngPath: string } | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setHumanizeReport('');
    setQuoteCard(null);
    try {
      const res = await fetch('/api/generate/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          formulaId: selectedFormula,
          founderAngleId: selectedAngle || undefined,
          targetLength,
          customInstructions
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setDraftText(data.cleanedDraft || data.rawDraft);
      setAuditScore(data.audit);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHumanizeRun = async () => {
    if (!draftText.trim()) return;
    setIsHumanizing(true);
    try {
      const res = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draftText })
      });
      const data = await res.json();
      setDraftText(data.cleaned);
      setAuditScore(data.audit);
      setHumanizeReport(data.report || 'No slop or watermark tells detected.');
    } catch (err: any) {
      alert(`Humanizer failed: ${err.message}`);
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleGenerateQuoteCard = async () => {
    if (!draftText.trim()) return;
    setIsGeneratingCard(true);
    try {
      // Use the first 1-2 lines of the post as the quote
      const firstLines = draftText.split('\n').filter(Boolean).slice(0, 2).join(' ');
      const quote = firstLines.slice(0, 180);

      const res = await fetch('/api/generate/quote-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteText: quote })
      });
      const data = await res.json();
      if (data.success) {
        setQuoteCard(data);
      } else {
        alert(data.error || 'Failed to generate visual card');
      }
    } catch (err: any) {
      alert(`Visual card error: ${err.message}`);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleQueueSubmit = async () => {
    if (!draftText.trim()) return;
    const formulaObj = formulas.find(f => f.id === selectedFormula);
    await onAddToQueue({
      type: 'post',
      title: `${formulaObj?.name || 'Post'}: ${topic.slice(0, 45)}...`,
      content: draftText,
      metadata: {
        formulaId: selectedFormula,
        founderAngleId: selectedAngle,
        audit: auditScore,
        mediaAttachment: quoteCard ? { type: 'image', url: quoteCard.imageUrl, filename: quoteCard.filename } : null
      }
    });
    setTopic('');
    setDraftText('');
    setAuditScore(null);
    setHumanizeReport('');
    setQuoteCard(null);
    alert('Post added to Review Queue with attached media!');
  };

  const charCount = draftText.length;
  const isOverSweetSpot = charCount > 1300;
  const foldMarkerIndex = 210;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Left: Configuration & Prompts */}
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wand2 size={18} style={{ color: 'var(--accent-indigo)' }} />
          <span>Post Studio & Hook Selector</span>
        </h3>

        <div className="form-group">
          <label className="form-label">Core Topic / Thesis</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Why we replaced our manual QA with AI test agents"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">2026 Proven Hook Formula</label>
          <select
            className="form-select"
            value={selectedFormula}
            onChange={e => setSelectedFormula(e.target.value)}
          >
            {formulas.map(f => (
              <option key={f.id} value={f.id}>
                {f.id}: {f.name} — ({f.bestFor})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Founder Angle (Optional)</label>
          <select
            className="form-select"
            value={selectedAngle}
            onChange={e => setSelectedAngle(e.target.value)}
          >
            <option value="">None (Standard General Post)</option>
            {founderAngles.map(a => (
              <option key={a.id} value={a.id}>
                {a.id}: {a.name} ({a.focus})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Target Length</label>
            <select
              className="form-select"
              value={targetLength}
              onChange={e => setTargetLength(e.target.value as any)}
            >
              <option value="short">Short (400 - 600 chars)</option>
              <option value="medium">Sweet Spot (900 - 1300 chars)</option>
              <option value="long">Deep Dive (1500 - 1900 chars)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Constraints</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. mention $40k savings, no emojis"
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
          id="btn-generate-post"
        >
          <Sparkles size={16} />
          <span>{isGenerating ? 'Engineering Post Draft...' : 'Generate 2026 Optimized Post'}</span>
        </button>
      </div>

      {/* Right: Draft Preview & Visuals */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>Live Feed Preview</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {auditScore && (
                <span className={`audit-chip ${auditScore.status?.toLowerCase() || 'review'}`}>
                  {auditScore.humanScore}/100 {auditScore.status}
                </span>
              )}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: isOverSweetSpot ? 'var(--accent-amber)' : 'var(--text-muted)'
              }}>
                {charCount} chars {targetLength === 'medium' && '(sweet spot: 900-1300)'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              style={{ minHeight: quoteCard ? '160px' : '230px' }}
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              placeholder="Your generated or typed post draft will appear here. Edit freely..."
            />
          </div>

          {/* LinkedIn Fold Indicator */}
          {charCount > foldMarkerIndex && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
              ℹ️ Characters before fold (210 chars):{' '}
              <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                "{draftText.slice(0, foldMarkerIndex)}...see more"
              </span>
            </div>
          )}

          {/* Attached Visual Quote Card */}
          {quoteCard && (
            <div style={{ position: 'relative', marginBottom: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <img
                src={quoteCard.imageUrl}
                alt="Hook visual quote card"
                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
              />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setQuoteCard(null)}
                style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px' }}
                title="Remove attached visual"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {humanizeReport && (
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <strong>Humanizer Scrub:</strong> {humanizeReport}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleHumanizeRun}
            disabled={!draftText.trim() || isHumanizing}
            title="Strip zero-width characters and slop"
          >
            <Shield size={14} />
            <span>{isHumanizing ? 'Cleaning...' : 'Humanize'}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleGenerateQuoteCard}
            disabled={!draftText.trim() || isGeneratingCard}
            title="Render visual graphic card from hook"
          >
            <ImageIcon size={14} />
            <span>{isGeneratingCard ? 'Rendering...' : 'Visual Card'}</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleQueueSubmit}
            disabled={!draftText.trim()}
            id="btn-add-queue-post"
          >
            <PlusCircle size={16} />
            <span>Queue Post</span>
          </button>
        </div>
      </div>
    </div>
  );
};
