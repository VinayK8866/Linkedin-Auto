import React, { useState } from 'react';
import { Check, X, Edit3, Send, Play, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface QueueItem {
  id: number;
  type: 'post' | 'connection' | 'comment' | 'dm';
  status: 'pending' | 'approved' | 'rejected' | 'dispatched' | 'failed';
  title?: string;
  content: string;
  targetUrl?: string;
  targetName?: string;
  metadata?: any;
  createdAt: string;
  error?: string;
}

interface ReviewQueueProps {
  items: QueueItem[];
  onRefresh: () => void;
  onUpdateStatus: (id: number, status: string, content?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onDispatchNext: () => Promise<void>;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  items,
  onRefresh,
  onUpdateStatus,
  onDelete,
  onDispatchNext
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'dispatched'>('pending');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const handleStartEdit = (item: QueueItem) => {
    setEditingId(item.id);
    setEditText(item.content);
  };

  const handleSaveEdit = async (id: number) => {
    await onUpdateStatus(id, 'pending', editText);
    setEditingId(null);
  };

  const handleDispatchNextClick = async () => {
    setIsDispatching(true);
    try {
      await onDispatchNext();
      onRefresh();
    } finally {
      setIsDispatching(false);
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const approvedCount = items.filter(i => i.status === 'approved').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('pending')}
          >
            Pending Approval ({pendingCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('approved')}
          >
            Approved Queue ({approvedCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'dispatched' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('dispatched')}
          >
            Dispatched
          </button>
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Items
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh} title="Refresh Queue">
            <RefreshCw size={14} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleDispatchNextClick}
            disabled={approvedCount === 0 || isDispatching}
            id="btn-dispatch-next"
          >
            <Play size={14} />
            <span>{isDispatching ? 'Executing...' : 'Dispatch Next Approved'}</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <Sparkles size={36} style={{ color: 'var(--accent-indigo)', opacity: 0.5, marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.35rem' }}>Queue is Clear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {filter === 'pending'
              ? 'No pending drafts waiting for review. Generate posts or connection notes to fill the queue.'
              : `No items found with status: ${filter}.`}
          </p>
        </div>
      ) : (
        <div className="queue-grid">
          {filteredItems.map(item => {
            const audit = item.metadata?.audit;
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} className={`glass-panel queue-card type-${item.type}`}>
                <div>
                  <div className="queue-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`queue-type-chip ${item.type}`}>{item.type}</span>
                      {audit && (
                        <span className={`audit-chip ${audit.status?.toLowerCase() || 'review'}`}>
                          {audit.humanScore}/100 {audit.status}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      #{item.id} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.title && (
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', margin: '0.65rem 0 0.4rem', fontWeight: 600 }}>
                      {item.title}
                    </h4>
                  )}

                  {item.targetUrl && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Target: <a href={item.targetUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{item.targetName || item.targetUrl}</a>
                    </div>
                  )}

                  {isEditing ? (
                    <textarea
                      className="form-textarea"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      style={{ width: '100%', marginTop: '0.5rem' }}
                    />
                  ) : (
                    <div className="queue-card-body">{item.content}</div>
                  )}

                  {item.error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#F87171', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span>{item.error}</span>
                    </div>
                  )}
                </div>

                <div className="queue-card-actions">
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {isEditing ? (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleSaveEdit(item.id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleStartEdit(item)} title="Edit draft">
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)} title="Delete item">
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {item.status === 'pending' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onUpdateStatus(item.id, 'approved')}
                        id={`btn-approve-${item.id}`}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    )}

                    {item.status === 'approved' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onUpdateStatus(item.id, 'pending')}
                        title="Revert to pending"
                      >
                        Undo Approval
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
