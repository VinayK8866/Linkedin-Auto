import React, { useState, useEffect } from 'react';
import { X, Save, Key, User, ShieldAlert, Clock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsSaved }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'persona' | 'safety' | 'linkedin'>('ai');
  const [settings, setSettings] = useState<any>({
    aiProvider: 'gemini',
    geminiApiKey: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    persona: {
      name: '',
      role: '',
      industry: '',
      bio: '',
      toneKeywords: [],
      bannedWords: []
    },
    rateLimits: {
      maxConnectionsPerDay: 15,
      maxCommentsPerDay: 20,
      maxPostsPerDay: 2,
      minDelaySeconds: 60,
      maxDelaySeconds: 180
    },
    workingHours: {
      startHour: 9,
      endHour: 18,
      activeDays: [1, 2, 3, 4, 5]
    },
    linkedinApp: {
      clientId: '',
      clientSecret: '',
      accessToken: ''
    },
    autoSchedule: false,
    useOfficialApiForPosts: false
  });

  const [toneKeywordsStr, setToneKeywordsStr] = useState('');
  const [bannedWordsStr, setBannedWordsStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setSettings(data);
          setToneKeywordsStr((data.persona?.toneKeywords || []).join(', '));
          setBannedWordsStr((data.persona?.bannedWords || []).join(', '));
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updated = {
      ...settings,
      persona: {
        ...settings.persona,
        toneKeywords: toneKeywordsStr.split(',').map(s => s.trim()).filter(Boolean),
        bannedWords: bannedWordsStr.split(',').map(s => s.trim()).filter(Boolean)
      }
    };

    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    onSettingsSaved();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem' }}>System & Persona Settings</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Setting Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ai')}
          >
            <Key size={13} />
            <span>AI Keys</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'persona' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('persona')}
          >
            <User size={13} />
            <span>Persona & Voice</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'safety' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('safety')}
          >
            <ShieldAlert size={13} />
            <span>Safety & Hours</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'linkedin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('linkedin')}
          >
            <span>LinkedIn API</span>
          </button>
        </div>

        {/* AI Provider Tab */}
        {activeTab === 'ai' && (
          <div>
            <div className="form-group">
              <label className="form-label">Active AI Provider</label>
              <select
                className="form-select"
                value={settings.aiProvider}
                onChange={e => setSettings({ ...settings, aiProvider: e.target.value })}
              >
                <option value="gemini">Google Gemini (Gemini 2.5 / 1.5 Flash)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Google Gemini API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy..."
                value={settings.geminiApiKey || ''}
                onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">OpenAI API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="sk-proj-..."
                value={settings.openaiApiKey || ''}
                onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anthropic Claude API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="sk-ant-..."
                value={settings.anthropicApiKey || ''}
                onChange={e => setSettings({ ...settings, anthropicApiKey: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Persona Tab */}
        {activeTab === 'persona' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Author Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.persona?.name || ''}
                  onChange={e => setSettings({
                    ...settings,
                    persona: { ...settings.persona, name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Professional Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.persona?.role || ''}
                  onChange={e => setSettings({
                    ...settings,
                    persona: { ...settings.persona, role: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Industry & Focus</label>
              <input
                type="text"
                className="form-input"
                value={settings.persona?.industry || ''}
                onChange={e => setSettings({
                  ...settings,
                  persona: { ...settings.persona, industry: e.target.value }
                })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tone Keywords (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={toneKeywordsStr}
                onChange={e => setToneKeywordsStr(e.target.value)}
                placeholder="e.g. candid, analytical, metric-driven, no fluff"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Banned Buzzwords (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={bannedWordsStr}
                onChange={e => setBannedWordsStr(e.target.value)}
                placeholder="e.g. delve, testament, game-changer, tapestry"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                These words are permanently forbidden in all AI prompts and stripped by the humanizer.
              </span>
            </div>
          </div>
        )}

        {/* Safety & Hours Tab */}
        {activeTab === 'safety' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Max Connections/Day</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.rateLimits?.maxConnectionsPerDay ?? 15}
                  onChange={e => setSettings({
                    ...settings,
                    rateLimits: { ...settings.rateLimits, maxConnectionsPerDay: Number(e.target.value) }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Comments/Day</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.rateLimits?.maxCommentsPerDay ?? 20}
                  onChange={e => setSettings({
                    ...settings,
                    rateLimits: { ...settings.rateLimits, maxCommentsPerDay: Number(e.target.value) }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Posts/Day</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.rateLimits?.maxPostsPerDay ?? 2}
                  onChange={e => setSettings({
                    ...settings,
                    rateLimits: { ...settings.rateLimits, maxPostsPerDay: Number(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Working Hours Start (0-23)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.workingHours?.startHour ?? 9}
                  onChange={e => setSettings({
                    ...settings,
                    workingHours: { ...settings.workingHours, startHour: Number(e.target.value) }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Working Hours End (0-23)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.workingHours?.endHour ?? 18}
                  onChange={e => setSettings({
                    ...settings,
                    workingHours: { ...settings.workingHours, endHour: Number(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.autoSchedule ?? false}
                  onChange={e => setSettings({ ...settings, autoSchedule: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  Enable Autonomous Scheduler Worker (Dispatches approved items inside working hours)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* LinkedIn App Tab */}
        {activeTab === 'linkedin' && (
          <div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={settings.useOfficialApiForPosts ?? false}
                  onChange={e => setSettings({ ...settings, useOfficialApiForPosts: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  Use Official LinkedIn Developer API for Content Posting (Falls back to stealth browser if unconfigured)
                </span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">LinkedIn Access Token</label>
              <input
                type="password"
                className="form-input"
                placeholder="AQV..."
                value={settings.linkedinApp?.accessToken || ''}
                onChange={e => setSettings({
                  ...settings,
                  linkedinApp: { ...settings.linkedinApp, accessToken: e.target.value }
                })}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Requires 'w_member_social' permission on your LinkedIn Developer App.
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
