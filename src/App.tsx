import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Database,
  Network,
  Server,
  MemoryStick as Memory,
  HardDrive,
  Search,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Terminal,
  History,
  FlaskConical,
  Rss,
  ExternalLink,
  ClipboardList,
  Code2,
  Github,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Settings,
  Key,
  RefreshCw
} from 'lucide-react';
import { LAB_SPECS, LAB_JOURNAL } from './constants';
import { AnalysisResult, FeedItem, ImplementationPlan, LabSpecs, OracleExperiment } from './types';
import { hardwareFeasibilityCheck, generateImplementationPlan } from './services/geminiService';
import { hardwareFeasibilityCheckLocal, generateImplementationPlanLocal } from './services/localService';
import { ModelProvider } from './types';
import { cn } from './lib/utils';
import {
  LocalUser,
  apiLogin,
  apiRegister,
  apiMe,
  apiLogout,
  apiGetSpecs,
  apiAddSpec,
  apiRemoveSpec,
  apiSeedSpecs,
  apiGetResearch,
  apiSaveResearch,
  apiRemoveResearch,
  apiSaveGeminiKey,
  apiGetExperiments,
  apiSaveExperiment,
  apiUpdateExperimentPlan,
} from './api';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-hardware-bg flex items-center justify-center p-4">
          <div className="hardware-widget p-8 max-w-md w-full border-red-500/30">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-xl font-bold uppercase tracking-tighter">System Failure</h2>
            </div>
            <p className="text-sm text-hardware-muted mb-6 font-mono leading-relaxed">
              {this.state.errorInfo || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-500 text-white font-bold uppercase tracking-widest rounded hover:bg-red-600 transition-colors"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LabOracleApp />
    </ErrorBoundary>
  );
}

// Login / Register modal
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: LocalUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = mode === 'login'
        ? await apiLogin(username, password)
        : await apiRegister(username, password, displayName || username);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="hardware-widget p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold uppercase tracking-tighter text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-hardware-accent" />
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-hardware-muted hover:text-hardware-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-black/10 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-hardware-accent"
            />
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            className="w-full bg-black/10 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-hardware-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-black/10 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-hardware-accent"
          />

          {error && (
            <p className="text-red-400 text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-hardware-card text-white font-bold uppercase tracking-widest rounded text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          className="mt-4 text-[10px] text-hardware-muted hover:text-hardware-accent uppercase font-mono tracking-wider w-full text-center"
        >
          {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
        </button>
      </motion.div>
    </div>
  );
}

function LabOracleApp() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedLastUpdated, setFeedLastUpdated] = useState<Date | null>(null);
  const [modelProvider, setModelProvider] = useState<ModelProvider>('gemini');

  const [specs, setSpecs] = useState<LabSpecs>([]);
  const [savedResearch, setSavedResearch] = useState<FeedItem[]>([]);
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpec, setNewSpec] = useState({ label: '', value: '' });
  const [isAddingResearch, setIsAddingResearch] = useState(false);
  const [newResearch, setNewResearch] = useState({ title: '', link: '', contentSnippet: '' });
  const [experiments, setExperiments] = useState<OracleExperiment[]>([]);
  const [expandedExperiment, setExpandedExperiment] = useState<number | null>(null);
  const [_currentPaper, setCurrentPaper] = useState<{ title: string; link: string } | null>(null);
  const [currentExperimentId, setCurrentExperimentId] = useState<number | null>(null);

  // Auth init — check existing token on mount
  useEffect(() => {
    apiMe().then(u => {
      setUser(u);
      if (u) setUserApiKey(u.geminiApiKey || '');
      setIsAuthReady(true);
    });
  }, []);

  // Load specs when user changes
  useEffect(() => {
    if (!user) {
      setSpecs(LAB_SPECS);
      return;
    }
    apiGetSpecs().then(async fetchedSpecs => {
      if (fetchedSpecs.length === 0) {
        await apiSeedSpecs(LAB_SPECS);
        setSpecs(LAB_SPECS);
      } else {
        setSpecs(fetchedSpecs);
      }
    }).catch(err => console.error("Failed to load specs:", err));
  }, [user]);

  // Load saved research when user changes
  useEffect(() => {
    if (!user) {
      setSavedResearch([]);
      return;
    }
    apiGetResearch()
      .then(setSavedResearch)
      .catch(err => console.error("Failed to load research:", err));
  }, [user]);

  // Load experiments when user changes
  useEffect(() => {
    if (!user) { setExperiments([]); return; }
    apiGetExperiments()
      .then(setExperiments)
      .catch(err => console.error("Failed to load experiments:", err));
  }, [user]);

  const handleAuthSuccess = (u: LocalUser) => {
    setUser(u);
    setUserApiKey(u.geminiApiKey || '');
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setUserApiKey('');
    setSpecs(LAB_SPECS);
    setSavedResearch([]);
    setExperiments([]);
    setCurrentExperimentId(null);
    setCurrentPaper(null);
  };

  const handleAddSpec = async () => {
    if (!newSpec.label || !newSpec.value) return;
    if (!user) { setError("Please sign in to save hardware specifications."); return; }
    try {
      const added = await apiAddSpec(newSpec.label, newSpec.value, 'Cpu');
      setSpecs(prev => [...prev, added]);
      setNewSpec({ label: '', value: '' });
      setIsAddingSpec(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add spec');
    }
  };

  const handleRemoveSpec = async (id: string) => {
    if (!user) return;
    try {
      await apiRemoveSpec(id);
      setSpecs(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to remove spec:", err);
    }
  };

  const toggleSaveResearch = async (item: FeedItem) => {
    if (!user) { setError("Please sign in to save research papers."); return; }
    const exists = savedResearch.find(r => r.link === item.link);
    try {
      if (exists) {
        await apiRemoveResearch(item.link);
        setSavedResearch(prev => prev.filter(r => r.link !== item.link));
      } else {
        await apiSaveResearch(item);
        setSavedResearch(prev => [item, ...prev]);
      }
    } catch (err) {
      console.error("Failed to toggle research:", err);
    }
  };

  const isSaved = (link: string) => savedResearch.some(r => r.link === link);

  const handleAddResearch = async () => {
    if (!newResearch.title || !newResearch.link) return;
    if (!user) { setError("Please sign in to save research papers."); return; }
    const item: FeedItem = {
      title: newResearch.title,
      link: newResearch.link,
      contentSnippet: newResearch.contentSnippet || 'Manually added research.',
      pubDate: new Date().toISOString(),
      author: 'Manual Entry',
    };
    try {
      await apiSaveResearch(item);
      setSavedResearch(prev => [item, ...prev]);
      setNewResearch({ title: '', link: '', contentSnippet: '' });
      setIsAddingResearch(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add research');
    }
  };


  const fetchFeed = async () => {
    setIsFeedLoading(true);
    try {
      const response = await fetch('/api/research-feed');
      if (response.ok) {
        setFeed(await response.json());
        setFeedLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setIsFeedLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  const handleSaveApiKey = async (key: string) => {
    if (!user) return;
    try {
      await apiSaveGeminiKey(key);
      setUserApiKey(key);
      setIsSettingsOpen(false);
    } catch (err) {
      console.error("Error saving API key:", err);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent, manualIdea?: string, paper?: { title: string; link: string }) => {
    if (e) e.preventDefault();
    const currentIdea = manualIdea || idea;
    if (!currentIdea.trim()) return;
    if (manualIdea) setIdea(manualIdea);
    if (paper) setCurrentPaper(paper);
    else setCurrentPaper(null);
    setCurrentExperimentId(null);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setPlan(null);
    try {
      const rawAnalysis = modelProvider === 'local'
        ? await hardwareFeasibilityCheckLocal(currentIdea, specs)
        : await hardwareFeasibilityCheck(currentIdea, specs, userApiKey);
      const analysis = { ...rawAnalysis, modelUsed: modelProvider };
      setResult(analysis);
      window.scrollTo({ top: document.getElementById('analysis-section')?.offsetTop || 0, behavior: 'smooth' });
      // Auto-save if not a hard fail and user is logged in
      if (analysis.feasibility !== 'FAIL' && user) {
        const title = paper?.title || currentIdea.split('\n')[0].replace(/^Title:\s*/i, '').substring(0, 120);
        try {
          const id = await apiSaveExperiment({
            title,
            sourceLink: paper?.link || null,
            ideaText: currentIdea,
            analysis,
          });
          setCurrentExperimentId(id);
          setExperiments(prev => [{
            id, title, sourceLink: paper?.link || null, ideaText: currentIdea,
            analysis, plan: null, createdAt: new Date().toISOString()
          }, ...prev]);
        } catch (saveErr) {
          console.error("Failed to auto-save experiment:", saveErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please check your connection or API key.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!idea.trim()) return;
    setIsGeneratingPlan(true);
    setError(null);
    try {
      const rawPlan = modelProvider === 'local'
        ? await generateImplementationPlanLocal(idea, specs)
        : await generateImplementationPlan(idea, specs, userApiKey);
      const implementationPlan = { ...rawPlan, modelUsed: modelProvider };
      setPlan(implementationPlan);
      // Auto-save plan to existing experiment record
      if (currentExperimentId && user) {
        try {
          await apiUpdateExperimentPlan(currentExperimentId, implementationPlan);
          setExperiments(prev => prev.map(e =>
            e.id === currentExperimentId ? { ...e, plan: implementationPlan } : e
          ));
        } catch (saveErr) {
          console.error("Failed to auto-save plan:", saveErr);
        }
      }
      setTimeout(() => {
        window.scrollTo({ top: document.getElementById('plan-section')?.offsetTop || 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate implementation plan.');
      console.error(err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase flex items-center gap-3">
            <FlaskConical className="w-10 h-10 text-hardware-card" />
            AI Lab Oracle
          </h1>
          <p className="text-hardware-muted font-mono text-xs mt-1">
            Hardware Feasibility & Research Optimization System v1.0.4
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isAuthReady && (
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-hardware-muted uppercase tracking-wider">Authenticated</span>
                    <span className="text-xs font-bold text-hardware-card">{user.displayName}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-hardware-card flex items-center justify-center text-white">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors text-hardware-muted hover:text-hardware-accent"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors text-hardware-muted hover:text-red-500"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 bg-hardware-card text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-black/5">
            <div className="flex flex-col">
              <span className="hardware-label">AI Model</span>
              <select
                value={modelProvider}
                onChange={e => setModelProvider(e.target.value as ModelProvider)}
                className="text-xs font-bold font-mono bg-transparent border-none outline-none cursor-pointer text-hardware-card uppercase tracking-wider"
              >
                <option value="gemini">Gemini</option>
                <option value="local">Local model</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-black/5">
            <div className="flex flex-col">
              <span className="hardware-label">System Status</span>
              <span className="flex items-center gap-2 text-sm font-bold text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Research Feed - Full Width */}
      <section className="hardware-widget p-6">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-hardware-accent" />
              <h2 className="font-bold tracking-tight uppercase text-sm">Live Research Feed</h2>
            </div>
            <a
              href="#saved-research"
              className="text-[10px] text-hardware-accent hover:underline uppercase font-bold flex items-center gap-1"
            >
              <Bookmark className="w-3 h-3" />
              Saved ({savedResearch.length})
            </a>
          </div>
          <div className="flex items-center gap-3">
            {feedLastUpdated && (
              <span className="text-[10px] text-hardware-muted font-mono uppercase">
                Updated {feedLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchFeed}
              disabled={isFeedLoading}
              className="text-[10px] text-hardware-accent hover:text-white transition-colors flex items-center gap-1 uppercase font-bold disabled:opacity-40"
              title="Refresh feed"
            >
              <RefreshCw className={cn("w-3 h-3", isFeedLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {isFeedLoading ? (
            <div className="flex items-center justify-center w-full py-8">
              <div className="w-6 h-6 border-2 border-hardware-accent/30 border-t-hardware-accent rounded-full animate-spin" />
            </div>
          ) : feed.length > 0 ? (
            feed.map((item, i) => (
              <div key={i} className="min-w-[300px] max-w-[300px] bg-white/5 p-4 rounded-lg border border-white/5 flex flex-col justify-between snap-start group relative">
                <button
                  onClick={() => toggleSaveResearch(item)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-hardware-muted hover:text-hardware-accent transition-colors z-10"
                  title={isSaved(item.link) ? "Unsave" : "Save"}
                >
                  {isSaved(item.link) ? <BookmarkCheck className="w-4 h-4 text-hardware-accent" /> : <BookmarkPlus className="w-4 h-4" />}
                </button>
                <div>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold leading-tight mb-2 pr-8 hover:text-hardware-accent transition-colors block">{item.title} <ExternalLink className="w-3 h-3 inline-block opacity-50" /></a>
                  <p className="text-[10px] text-hardware-muted leading-relaxed line-clamp-4">{item.contentSnippet}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-hardware-muted/60 uppercase">{item.author}</span>
                  <button
                    onClick={() => handleAnalyze(undefined, `Can I run/test this AI research paper in my home lab?\n\nTitle: ${item.title}\n\nAbstract: ${item.contentSnippet}`, { title: item.title, link: item.link })}
                    className="text-[10px] text-hardware-accent hover:underline flex items-center gap-1 font-bold uppercase tracking-wider"
                  >
                    <Terminal className="w-3 h-3" /> Analyze
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-hardware-muted font-mono py-4">No feed items available.</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Lab Specs */}
          <section className="hardware-widget p-6">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-hardware-accent" />
                Lab Specs
              </h2>
              {user && (
                <button onClick={() => setIsAddingSpec(!isAddingSpec)} className="p-1 text-hardware-muted hover:text-hardware-accent transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isAddingSpec && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex flex-col gap-2">
                  <input type="text" placeholder="Label" value={newSpec.label} onChange={e => setNewSpec(p => ({ ...p, label: e.target.value }))} className="w-full bg-black/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-hardware-accent" />
                  <input type="text" placeholder="Value" value={newSpec.value} onChange={e => setNewSpec(p => ({ ...p, value: e.target.value }))} className="w-full bg-black/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-hardware-accent" />
                  <button onClick={handleAddSpec} className="w-full py-1.5 bg-hardware-card text-white font-bold uppercase tracking-widest rounded text-[10px] hover:opacity-90">Add Spec</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {specs.map((spec) => {
                const iconMap: Record<string, React.ReactNode> = { Server: <Server className="w-4 h-4" />, Memory: <Memory className="w-4 h-4" />, Terminal: <Terminal className="w-4 h-4" />, HardDrive: <HardDrive className="w-4 h-4" />, Database: <Database className="w-4 h-4" />, Network: <Network className="w-4 h-4" />, Cpu: <Cpu className="w-4 h-4" /> };
                return (
                  <div key={spec.id} className="flex items-start gap-3 group">
                    <div className="mt-0.5 text-hardware-accent flex-shrink-0">{iconMap[spec.icon || 'Cpu'] || <Cpu className="w-4 h-4" />}</div>
                    <div className="flex-1 min-w-0">
                      <span className="hardware-label">{spec.label}</span>
                      <p className="text-xs font-semibold truncate" title={spec.value}>{spec.value}</p>
                    </div>
                    {user && (
                      <button onClick={() => handleRemoveSpec(spec.id)} className="opacity-0 group-hover:opacity-100 text-hardware-muted hover:text-red-500 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Lab Journal */}
          <section className="hardware-widget p-6">
            <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <History className="w-4 h-4 text-hardware-accent" />
              Lab Journal
            </h2>
            <div className="space-y-4">
              {LAB_JOURNAL.map((entry, i) => (
                <div key={i} className="text-xs border-l-2 border-hardware-accent/30 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">{entry.project}</span>
                    <span className={cn("font-mono text-[9px] uppercase px-1.5 py-0.5 rounded", entry.status === 'Success' ? 'bg-green-500/20 text-green-400' : entry.status === 'Failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>{entry.status}</span>
                  </div>
                  <p className="text-hardware-muted leading-relaxed">{entry.learnings}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Saved Research */}
          <section className="hardware-widget p-6" id="saved-research">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-hardware-accent" />
                Saved Research {savedResearch.length > 0 && <span className="text-hardware-muted font-mono text-[10px]">({savedResearch.length})</span>}
              </h2>
              {user && (
                <button onClick={() => setIsAddingResearch(!isAddingResearch)} className="p-1 text-hardware-muted hover:text-hardware-accent transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isAddingResearch && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex flex-col gap-2">
                  <input type="text" placeholder="Title" value={newResearch.title} onChange={e => setNewResearch(p => ({ ...p, title: e.target.value }))} className="w-full bg-black/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-hardware-accent" />
                  <input type="url" placeholder="URL" value={newResearch.link} onChange={e => setNewResearch(p => ({ ...p, link: e.target.value }))} className="w-full bg-black/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-hardware-accent" />
                  <input type="text" placeholder="Snippet (optional)" value={newResearch.contentSnippet} onChange={e => setNewResearch(p => ({ ...p, contentSnippet: e.target.value }))} className="w-full bg-black/10 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-hardware-accent" />
                  <button onClick={handleAddResearch} className="w-full py-1.5 bg-hardware-card text-white font-bold uppercase tracking-widest rounded text-[10px] hover:opacity-90">Save</button>
                </motion.div>
              )}
            </AnimatePresence>

            {savedResearch.length === 0 ? (
              <p className="text-[10px] font-mono text-hardware-muted/50 uppercase">No saved research yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {savedResearch.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <button onClick={() => toggleSaveResearch(item)} className="flex-shrink-0 mt-0.5 text-hardware-muted/40 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold leading-tight hover:text-hardware-accent transition-colors block truncate" title={item.title}>
                        {item.title}
                      </a>
                      {item.author && <p className="text-[9px] font-mono text-hardware-muted/50 uppercase mt-0.5">{item.author}</p>}
                    </div>
                    <button
                      onClick={() => handleAnalyze(undefined, `Can I run/test this AI research paper in my home lab?\n\nTitle: ${item.title}\n\nAbstract: ${item.contentSnippet}`, { title: item.title, link: item.link })}
                      className="flex-shrink-0 text-[9px] text-hardware-accent/60 hover:text-hardware-accent transition-colors font-mono uppercase"
                      title="Analyze"
                    >
                      <Terminal className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Analysis Input */}
          <section className="hardware-widget p-6" id="analysis-section">
            <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <Search className="w-4 h-4 text-hardware-accent" />
              Feasibility Analysis
            </h2>
            <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="Describe your AI project or experiment idea..."
                rows={4}
                className="w-full bg-black/10 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:border-hardware-accent placeholder:text-hardware-muted/50"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan || !result || result.feasibility === 'FAIL'}
                  className="flex items-center gap-2 border border-hardware-accent/40 text-hardware-accent px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-hardware-accent/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
                >
                  {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  {isGeneratingPlan ? '>_ Generating...' : '>_ Generate Implementation Plan'}
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzing || !idea.trim()}
                  className="flex items-center gap-2 bg-hardware-card text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 font-mono"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                  {isAnalyzing ? 'Running...' : '>_ Run Oracle Check'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">System Error</p>
                  <p className="text-xs font-mono">{error}</p>
                </div>
              </div>
            )}
          </section>

          {/* Analysis Result */}
          <AnimatePresence>
            {result && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="hardware-widget p-6"
              >
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2">
                    {result.feasibility === 'PASS' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : result.feasibility === 'FAIL' ? <AlertCircle className="w-4 h-4 text-red-500" /> : <HelpCircle className="w-4 h-4 text-yellow-500" />}
                    Analysis Result
                  </h2>
                  <span className={cn("font-mono text-xs font-bold px-3 py-1 rounded-full uppercase", result.feasibility === 'PASS' ? 'bg-green-500/20 text-green-400' : result.feasibility === 'FAIL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>
                    {result.feasibility}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4">{result.reasoning}</p>
                {result.suggestions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="hardware-label mb-2">Suggestions</h3>
                    <ul className="space-y-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <ArrowRight className="w-3 h-3 text-hardware-accent flex-shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentExperimentId && user && (
                  <span className="text-[10px] font-mono text-green-500/70 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-saved to Experiment Log
                  </span>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Implementation Plan */}
          <AnimatePresence>
            {plan && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="hardware-widget p-6"
                id="plan-section"
              >
                <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <ClipboardList className="w-4 h-4 text-hardware-accent" />
                  Implementation Plan: {plan.title}
                </h2>
                <p className="text-sm leading-relaxed mb-4">{plan.summary}</p>
                {plan.architecture_recommendation && (
                  <div className="mb-4 p-3 bg-hardware-accent/5 rounded-lg border border-hardware-accent/10">
                    <h3 className="hardware-label mb-1">Architecture</h3>
                    <p className="text-xs leading-relaxed">{plan.architecture_recommendation}</p>
                  </div>
                )}
                {plan.git_resources.length > 0 && (
                  <div className="mb-4">
                    <h3 className="hardware-label mb-2">Resources</h3>
                    <div className="flex flex-wrap gap-2">
                      {plan.git_resources.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] font-mono bg-black/10 px-2 py-1 rounded hover:bg-hardware-accent/10 transition-colors">
                          <Github className="w-3 h-3" /> {r.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {plan.steps.map((step, i) => (
                    <div key={i} className="border-l-2 border-hardware-accent/30 pl-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-hardware-card/20 flex items-center justify-center text-[9px] font-mono">{i + 1}</span>
                        {step.phase}
                      </h3>
                      <ul className="space-y-1">
                        {step.tasks.map((task, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-hardware-muted">
                            <Code2 className="w-3 h-3 flex-shrink-0 mt-0.5 text-hardware-accent/50" />
                            {task}
                          </li>
                        ))}
                      </ul>
                      {step.hardware_considerations && (
                        <p className="mt-2 text-[10px] font-mono text-hardware-muted/60 italic">{step.hardware_considerations}</p>
                      )}
                    </div>
                  ))}
                </div>
                {plan.agent_instructions && (
                  <div className="mt-4 p-3 bg-black/20 rounded-lg">
                    <h3 className="hardware-label mb-1 flex items-center gap-1"><Terminal className="w-3 h-3" /> Agent Instructions</h3>
                    <p className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap">{plan.agent_instructions}</p>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Experiment Log */}
          {experiments.length > 0 && (
          <section className="hardware-widget p-6">
          <h2 className="font-bold tracking-tight uppercase text-sm flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
            <History className="w-4 h-4 text-hardware-accent" />
            Experiment Log ({experiments.length})
          </h2>
          <div className="space-y-2">
            {experiments.map((exp) => (
              <div key={exp.id} className="border border-white/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedExperiment(expandedExperiment === exp.id ? null : exp.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("flex-shrink-0 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                      exp.analysis.feasibility === 'PASS' ? 'bg-green-500/20 text-green-400' :
                      exp.analysis.feasibility === 'CONDITIONAL' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>{exp.analysis.feasibility}</span>
                    <span className="text-xs font-semibold truncate">{exp.title}</span>
                    {exp.analysis.modelUsed && (
                      <span className={cn("flex-shrink-0 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded",
                        exp.analysis.modelUsed === 'local' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      )}>{exp.analysis.modelUsed === 'local' ? 'Local' : 'Gemini'}</span>
                    )}
                    {exp.plan && <span className="flex-shrink-0 text-[9px] font-mono text-hardware-accent uppercase bg-hardware-accent/10 px-1.5 py-0.5 rounded">+ Plan</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {exp.sourceLink && (
                      <a href={exp.sourceLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-hardware-muted hover:text-hardware-accent">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-[9px] font-mono text-hardware-muted/50">{new Date(exp.createdAt).toLocaleDateString()}</span>
                    <ArrowRight className={cn("w-3 h-3 text-hardware-muted transition-transform", expandedExperiment === exp.id && "rotate-90")} />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedExperiment === exp.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 space-y-4">
                        {/* Analysis */}
                        <div>
                          <h3 className="hardware-label mb-2 flex items-center gap-1"><Search className="w-3 h-3" /> Analysis</h3>
                          <p className="text-xs leading-relaxed text-hardware-muted mb-2">{exp.analysis.reasoning}</p>
                          {exp.analysis.suggestions.length > 0 && (
                            <ul className="space-y-1">
                              {exp.analysis.suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-[11px] text-hardware-muted">
                                  <ArrowRight className="w-3 h-3 text-hardware-accent flex-shrink-0 mt-0.5" />{s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Plan */}
                        {exp.plan ? (
                          <div className="border-t border-white/5 pt-4">
                            <h3 className="hardware-label mb-2 flex items-center gap-2"><ClipboardList className="w-3 h-3" /> Implementation Plan — {exp.plan.title}
                              {exp.plan.modelUsed && (
                                <span className={cn("text-[9px] font-mono uppercase px-1.5 py-0.5 rounded",
                                  exp.plan.modelUsed === 'local' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                )}>{exp.plan.modelUsed === 'local' ? 'Local' : 'Gemini'}</span>
                              )}
                            </h3>
                            <p className="text-xs leading-relaxed text-hardware-muted mb-3">{exp.plan.summary}</p>
                            {exp.plan.architecture_recommendation && (
                              <div className="mb-3 p-2 bg-hardware-accent/5 rounded border border-hardware-accent/10 text-[11px] leading-relaxed">{exp.plan.architecture_recommendation}</div>
                            )}
                            {exp.plan.git_resources.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {exp.plan.git_resources.map((r, i) => (
                                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-mono bg-black/10 px-2 py-1 rounded hover:bg-hardware-accent/10 transition-colors">
                                    <Github className="w-3 h-3" /> {r.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            {exp.plan.steps.map((step, i) => (
                              <div key={i} className="border-l-2 border-hardware-accent/20 pl-3 mb-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-hardware-accent">{step.phase}</p>
                                <ul className="space-y-0.5">
                                  {step.tasks.map((task, j) => (
                                    <li key={j} className="text-[11px] text-hardware-muted flex items-start gap-1.5">
                                      <Code2 className="w-3 h-3 flex-shrink-0 mt-0.5 text-hardware-accent/40" />{task}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                            {exp.plan.agent_instructions && (
                              <div className="mt-3 p-3 bg-black/20 rounded-lg">
                                <h4 className="hardware-label mb-1 flex items-center gap-1"><Terminal className="w-3 h-3" /> Agent Instructions</h4>
                                <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-hardware-muted overflow-auto max-h-60 custom-scrollbar">{exp.plan.agent_instructions}</pre>
                              </div>
                            )}
                          </div>
                        ) : exp.analysis.feasibility !== 'FAIL' && (
                          <div className="border-t border-white/5 pt-3">
                            <p className="text-[10px] font-mono text-hardware-muted/50">No implementation plan generated yet.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="hardware-widget p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold uppercase tracking-tighter text-lg flex items-center gap-2">
                  <Key className="w-5 h-5 text-hardware-accent" />
                  API Settings
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-hardware-muted hover:text-hardware-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <label className="hardware-label">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIza..."
                  defaultValue={userApiKey}
                  id="api-key-input"
                  className="w-full bg-black/10 border border-white/10 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-hardware-accent"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('api-key-input') as HTMLInputElement;
                    handleSaveApiKey(input.value);
                  }}
                  className="w-full py-2.5 bg-hardware-card text-white font-bold uppercase tracking-widest rounded text-xs hover:opacity-90"
                >
                  Save Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
