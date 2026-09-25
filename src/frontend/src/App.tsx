import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { ReviewQueue } from './components/ReviewQueue.js';
import { PostComposer } from './components/PostComposer.js';
import { CarouselBuilder } from './components/CarouselBuilder.js';
import { OutreachManager } from './components/OutreachManager.js';
import { EngagementManager } from './components/EngagementManager.js';
import { ActivityLogs } from './components/ActivityLogs.js';
import { SettingsModal } from './components/SettingsModal.js';
import { Layers, PenTool, Inbox, Users, Activity, Target } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'composer' | 'carousel' | 'outreach' | 'engagement' | 'logs'>('queue');
  const [status, setStatus] = useState<any>(null);
  const [session, setSession] = useState<{ isLoggedIn: boolean; message: string } | null>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [founderAngles, setFounderAngles] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/session/check');
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      setQueueItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await fetch('/api/metadata/formulas');
      const data = await res.json();
      setFormulas(data.hookFormulas || []);
      setFounderAngles(data.founderAngles || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSession();
    fetchQueue();
    fetchMetadata();

    const interval = setInterval(() => {
      fetchStatus();
      fetchQueue();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchLogin = async () => {
    try {
      const res = await fetch('/api/session/login', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch (err: any) {
      alert(`Login launch error: ${err.message}`);
    }
  };

  const handleUpdateQueueStatus = async (id: number, newStatus: string, content?: string) => {
    await fetch(`/api/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, content })
    });
    fetchQueue();
    fetchStatus();
  };

  const handleDeleteQueueItem = async (id: number) => {
    await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    fetchQueue();
  };

  const handleDispatchNext = async () => {
    const res = await fetch('/api/queue/dispatch-next', { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    fetchQueue();
    fetchStatus();
  };

  const handleAddToQueue = async (item: any) => {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    fetchQueue();
    setActiveTab('queue');
  };

  const pendingCount = queueItems.filter(i => i.status === 'pending').length;

  return (
    <div className="app-container">
      <Header
        status={status}
        session={session}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLaunchLogin={handleLaunchLogin}
        onCheckSession={fetchSession}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
          id="tab-queue"
        >
          <Inbox size={16} />
          <span>Review Queue</span>
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
          onClick={() => setActiveTab('composer')}
          id="tab-composer"
        >
          <PenTool size={16} />
          <span>Post Studio</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'carousel' ? 'active' : ''}`}
          onClick={() => setActiveTab('carousel')}
          id="tab-carousel"
        >
          <Layers size={16} />
          <span>Carousel Builder</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'outreach' ? 'active' : ''}`}
          onClick={() => setActiveTab('outreach')}
          id="tab-outreach"
        >
          <Users size={16} />
          <span>Prospect Outreach</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'engagement' ? 'active' : ''}`}
          onClick={() => setActiveTab('engagement')}
          id="tab-engagement"
        >
          <Target size={16} />
          <span>Creator Monitor</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          id="tab-logs"
        >
          <Activity size={16} />
          <span>Audit Logs</span>
        </button>
      </nav>

      {/* Main Views */}
      <main className="main-content">
        {activeTab === 'queue' && (
          <ReviewQueue
            items={queueItems}
            onRefresh={fetchQueue}
            onUpdateStatus={handleUpdateQueueStatus}
            onDelete={handleDeleteQueueItem}
            onDispatchNext={handleDispatchNext}
          />
        )}

        {activeTab === 'composer' && (
          <PostComposer
            formulas={formulas}
            founderAngles={founderAngles}
            onAddToQueue={handleAddToQueue}
          />
        )}

        {activeTab === 'carousel' && (
          <CarouselBuilder onAddToQueue={handleAddToQueue} />
        )}

        {activeTab === 'outreach' && (
          <OutreachManager onAddToQueue={handleAddToQueue} />
        )}

        {activeTab === 'engagement' && (
          <EngagementManager />
        )}

        {activeTab === 'logs' && (
          <ActivityLogs />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          fetchStatus();
          fetchMetadata();
        }}
      />
    </div>
  );
};
