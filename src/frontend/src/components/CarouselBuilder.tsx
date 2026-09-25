import React, { useState } from 'react';
import { Layers, Sparkles, PlusCircle } from 'lucide-react';

interface CarouselBuilderProps {
  onAddToQueue: (item: { type: string; title: string; content: string; metadata: any }) => Promise<void>;
}

export const CarouselBuilder: React.FC<CarouselBuilderProps> = ({ onAddToQueue }) => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<Array<{ slideNumber: number; headline: string; content: string; slideType: string }>>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
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

  const handleQueueCarousel = async () => {
    if (slides.length === 0) return;
    const fullText = slides.map(s => `[Slide ${s.slideNumber}: ${s.slideType?.toUpperCase()}]\n${s.headline}\n${s.content}`).join('\n\n---\n\n');
    await onAddToQueue({
      type: 'post',
      title: `Carousel Document Post: ${topic.slice(0, 40)}`,
      content: fullText,
      metadata: {
        isCarousel: true,
        slidesCount: slides.length,
        slides
      }
    });
    setTopic('');
    setSlides([]);
    alert('Carousel post queued for review!');
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Document Post (Carousel) Engine</span>
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            High-dwell format: 8-12 slides, max 25 words per slide, standalone recap for screenshots.
          </p>
        </div>

        {slides.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={handleQueueCarousel}>
            <PlusCircle size={14} />
            <span>Add Carousel to Queue</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
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
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
        >
          <Sparkles size={15} />
          <span>{isGenerating ? 'Structuring...' : 'Generate Carousel'}</span>
        </button>
      </div>

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
