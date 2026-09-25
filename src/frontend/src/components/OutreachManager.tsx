import React, { useState, useEffect } from 'react';
import { UserPlus, Sparkles, Send, Trash2, ExternalLink } from 'lucide-react';

interface Prospect {
  id: number;
  profileUrl: string;
  name: string;
  headline?: string;
  company?: string;
  status: string;
  notes?: string;
}

interface OutreachManagerProps {
  onAddToQueue: (item: { type: string; title: string; content: string; targetUrl: string; targetName: string; metadata: any }) => Promise<void>;
}

export const OutreachManager: React.FC<OutreachManagerProps> = ({ onAddToQueue }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [company, setCompany] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [specificHook, setSpecificHook] = useState('');
  const [isGenerating, setIsGenerating] = useState<number | null>(null);

  const fetchProspects = async () => {
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      setProspects(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl.trim() || !name.trim()) return;

    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileUrl, name, headline, company, notes: specificHook })
    });

    setName('');
    setHeadline('');
    setCompany('');
    setProfileUrl('');
    setSpecificHook('');
    fetchProspects();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
    fetchProspects();
  };

  const handleGenerateAndQueue = async (prospect: Prospect) => {
    setIsGenerating(prospect.id);
    try {
      const res = await fetch('/api/generate/connection-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: prospect.name,
          headline: prospect.headline,
          company: prospect.company,
          specificHook: prospect.notes
        })
      });
      const data = await res.json();

      await onAddToQueue({
        type: 'connection',
        title: `Connect with ${prospect.name}`,
        content: data.note,
        targetUrl: prospect.profileUrl,
        targetName: prospect.name,
        metadata: {
          headline: prospect.headline,
          company: prospect.company,
          charCount: data.charCount
        }
      });

      alert(`Generated 200-char note for ${prospect.name} and queued for review!`);
    } catch (err: any) {
      alert(`Note generation failed: ${err.message}`);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
      {/* Add Prospect Form */}
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span>Add Target Prospect</span>
        </h3>

        <form onSubmit={handleAddProspect}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Alex Thorne"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">LinkedIn Profile URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://www.linkedin.com/in/username"
              value={profileUrl}
              onChange={e => setProfileUrl(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Role / Headline</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. VP of Engineering"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Stripe"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Specific Context / Hook</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Read their recent post on distributed consensus"
              value={specificHook}
              onChange={e => setSpecificHook(e.target.value)}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              li-dm rule: Note must reference something specific they shipped or wrote.
            </span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Add Prospect to Target Roster
          </button>
        </form>
      </div>

      {/* Prospect Roster */}
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '1.25rem' }}>
          Target Prospects ({prospects.length})
        </h3>

        {prospects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No target prospects added yet. Enter a LinkedIn profile URL on the left.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {prospects.map(p => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{p.name}</strong>
                    {p.company && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', color: '#CBD5E1' }}>
                        {p.company}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                    {p.headline || 'No headline recorded'}
                  </div>
                  {p.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', marginTop: '0.25rem' }}>
                      Hook: "{p.notes}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={p.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="View Profile on LinkedIn"
                  >
                    <ExternalLink size={13} />
                  </a>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleGenerateAndQueue(p)}
                    disabled={isGenerating === p.id}
                  >
                    <Sparkles size={13} />
                    <span>{isGenerating === p.id ? 'Drafting...' : 'Draft & Queue Note'}</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(p.id)}
                    title="Remove from roster"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
