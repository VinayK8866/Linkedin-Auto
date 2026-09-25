import React, { useState, useEffect } from 'react';
import { Target, Search, Sparkles, Trash2, ExternalLink } from 'lucide-react';

interface Creator {
  id: number;
  profileUrl: string;
  name: string;
  headline?: string;
  category?: string;
  lastScannedAt?: string;
}

export const EngagementManager: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [name, setName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [category, setCategory] = useState('');
  const [isScanning, setIsScanning] = useState<number | null>(null);

  const fetchCreators = async () => {
    try {
      const res = await fetch('/api/creators');
      const data = await res.json();
      setCreators(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl.trim() || !name.trim()) return;

    await fetch('/api/creators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileUrl, name, category, autoEngage: true })
    });

    setName('');
    setProfileUrl('');
    setCategory('');
    fetchCreators();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/creators/${id}`, { method: 'DELETE' });
    fetchCreators();
  };

  const handleScanCreator = async (id: number) => {
    setIsScanning(id);
    try {
      const res = await fetch(`/api/creators/${id}/scan`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Scan completed.');
      fetchCreators();
    } catch (err: any) {
      alert(`Scanning failed: ${err.message}`);
    } finally {
      setIsScanning(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
      {/* Add Creator */}
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>Monitor High-Signal Creator</span>
        </h3>

        <form onSubmit={handleAddCreator}>
          <div className="form-group">
            <label className="form-label">Creator / Industry Leader Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sam Altman or Guillermo Rauch"
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

          <div className="form-group">
            <label className="form-label">Niche / Category</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. AI Infra / SaaS Founders"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Track Creator for Engagement
          </button>
        </form>
      </div>

      {/* Creator List */}
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '1.25rem' }}>
          Tracked Creators ({creators.length})
        </h3>

        {creators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No creators tracked yet. Add industry voices to monitor their posts and generate thoughtful comments.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {creators.map(c => (
              <div
                key={c.id}
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
                    <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                    {c.category && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
                        {c.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Last Scanned: {c.lastScannedAt ? new Date(c.lastScannedAt).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={c.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Open on LinkedIn"
                  >
                    <ExternalLink size={13} />
                  </a>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleScanCreator(c.id)}
                    disabled={isScanning === c.id}
                  >
                    <Sparkles size={13} />
                    <span>{isScanning === c.id ? 'Scanning Post...' : 'Scan & Queue Comment'}</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(c.id)}
                    title="Remove creator"
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
