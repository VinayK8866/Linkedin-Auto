import React from 'react';
import { Settings, ShieldCheck, Globe, Play, UserCheck, MessageSquare, Send } from 'lucide-react';

interface HeaderProps {
  status: {
    quotas: { connection: number; comment: number; post: number };
    limits: { maxConnectionsPerDay: number; maxCommentsPerDay: number; maxPostsPerDay: number };
    inWorkingHours: boolean;
    autoSchedule: boolean;
  } | null;
  session: { isLoggedIn: boolean; message: string } | null;
  onOpenSettings: () => void;
  onLaunchLogin: () => void;
  onCheckSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  session,
  onOpenSettings,
  onLaunchLogin,
  onCheckSession
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">in</div>
        <div>
          <h1 className="brand-title">LinkedIn Intelligence Hub</h1>
          <div className="brand-tag">
            <span>2026 Content Engineering & Stealth Runner</span>
            {status?.inWorkingHours && (
              <span style={{ color: '#34D399', fontWeight: 600 }}>• Active Hours</span>
            )}
          </div>
        </div>
      </div>

      <div className="header-status-group">
        {/* Quota Indicators */}
        {status && (
          <>
            <div className="quota-pill" title="Connection requests sent today">
              <UserCheck size={14} style={{ color: '#34D399' }} />
              <span>Connect: <strong>{status.quotas.connection}</strong>/{status.limits.maxConnectionsPerDay}</span>
            </div>
            <div className="quota-pill" title="Comments published today">
              <MessageSquare size={14} style={{ color: '#FBBF24' }} />
              <span>Comments: <strong>{status.quotas.comment}</strong>/{status.limits.maxCommentsPerDay}</span>
            </div>
            <div className="quota-pill" title="Posts published today">
              <Send size={14} style={{ color: '#818CF8' }} />
              <span>Posts: <strong>{status.quotas.post}</strong>/{status.limits.maxPostsPerDay}</span>
            </div>
          </>
        )}

        {/* Session Status Badge */}
        <div
          className={`status-badge ${session?.isLoggedIn ? 'connected' : 'disconnected'}`}
          onClick={onCheckSession}
          style={{ cursor: 'pointer' }}
          title={session?.message || 'Click to re-check session'}
        >
          <span className="status-dot"></span>
          <span>{session?.isLoggedIn ? 'Session Active' : 'Disconnected'}</span>
        </div>

        {!session?.isLoggedIn && (
          <button className="btn btn-primary btn-sm" onClick={onLaunchLogin} id="btn-login-manual">
            <Globe size={14} />
            <span>Launch Login Window</span>
          </button>
        )}

        <button className="btn btn-secondary btn-sm" onClick={onOpenSettings} id="btn-settings" title="Settings & Persona">
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
