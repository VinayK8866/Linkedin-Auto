import React, { useState } from 'react';
import { Layers, Sparkles, PlusCircle, FileDown, CheckCircle, Eye } from 'lucide-react';

interface CarouselBuilderProps {
  onAddToQueue: (item: { type: string; title: string; content: string; metadata: any }) => Promise<void>;
}

export const CarouselBuilder: React.FC<CarouselBuilderProps> = ({ onAddToQueue }) => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(8);
  const [theme, setTheme] = useState<'dark-indigo' | 'cyber-blue' | 'emerald-glow'>('dark-indigo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [slides, setSlides] = useState<Array<{ slideNumber: number; headline: string; content: string; slideType: string }>>([]);
  const [compiledPdf, setCompiledPdf] = useState<{ pdfUrl: string; filename: string; pdfPath: string } | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setCompiledPdf(null);
    try {
      const res = await fetch('/api/generate/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numSlides })
      });
      const data = await res.json();
      setSlides(data.slides || []);
    } catch (err: any) {
      alert(`Carousel generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompilePdf = async () => {
    if (slides.length === 0) return;
    setIsCompiling(true);
    try {
      const res = await fetch('/api/carousel/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, theme })
      });
      const data = await res.json();
      if (data.success) {
        setCompiledPdf(data);
      } else {
        alert(data.error || 'Failed to compile PDF');
      }
    } catch (err: any) {
      alert(`PDF compile error: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleQueueCarousel = async () => {
    if (slides.length === 0) return;
    const fullText = slides.map(s => `[Slide ${s.slideNumber}: ${s.slideType?.toUpperCase()}]\n${s.headline}\n${s.content}`).join('\n\n---\n\n');
    await onAddToQueue({
      type: 'post',
      title: `Carousel Document: ${topic.slice(0, 40)}`,
      content: fullText,
      metadata: {
        isCarousel: true,
        slidesCount: slides.length,
        slides,
        theme,
        pdfUrl: compiledPdf?.pdfUrl,
        pdfPath: compiledPdf?.pdfPath,
        mediaAttachment: compiledPdf ? { type: 'document', url: compiledPdf.pdfUrl, filename: compiledPdf.filename } : null
      }
    });
    setTopic('');
    setSlides([]);
    setCompiledPdf(null);
    alert('Carousel document post queued for review!');
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Document Post (Carousel) Engine & PDF Compiler</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Generates 1080×1350 vertical PDF slides ready for direct upload to LinkedIn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {slides.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCompilePdf}
              disabled={isCompiling}
            >
              <FileDown size={14} />
              <span>{isCompiling ? 'Rendering PDF...' : 'Compile 1080×1350 PDF'}</span>
            </button>
          )}

          {compiledPdf && (
            <a
              href={compiledPdf.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success btn-sm"
            >
              <Eye size={14} />
              <span>Preview / Download PDF</span>
            </a>
          )}

          {slides.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={handleQueueCarousel}>
              <PlusCircle size={14} />
              <span>Queue Carousel Post</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Topic, framework, or countdown (e.g. 7 microservices traps that killed our velocity)"
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
        <select
          className="form-select"
          value={numSlides}
          onChange={e => setNumSlides(Number(e.target.value))}
        >
          <option value={8}>8 Slides (Fast Swipe)</option>
          <option value={10}>10 Slides (Standard)</option>
          <option value={12}>12 Slides (Deep Framework)</option>
        </select>
        <select
          className="form-select"
          value={theme}
          onChange={e => setTheme(e.target.value as any)}
        >
          <option value="dark-indigo">Dark Indigo Glow</option>
          <option value="cyber-blue">Cyber Blue Glow</option>
          <option value="emerald-glow">Emerald Glow</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
        >
          <Sparkles size={15} />
          <span>{isGenerating ? 'Structuring...' : 'Generate Slides'}</span>
        </button>
      </div>

      {compiledPdf && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34D399', fontSize: '0.88rem' }}>
            <CheckCircle size={16} />
            <span>Document PDF compiled successfully (1080×1350px 4:5 vertical). Ready to publish.</span>
          </div>
          <a
            href={compiledPdf.pdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38BDF8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
          >
            {compiledPdf.filename}
          </a>
        </div>
      )}

      {slides.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {slides.map(slide => (
            <div
              key={slide.slideNumber}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '220px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                  <span>SLIDE {slide.slideNumber}</span>
                  <span style={{ textTransform: 'uppercase', color: 'var(--accent-indigo)' }}>{slide.slideType}</span>
                </div>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginBottom: '0.5rem', color: '#F1F5F9' }}>
                  {slide.headline}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5 }}>
                  {slide.content}
                </p>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                Words: {slide.content.split(/\s+/).length} (limit: 25)
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
