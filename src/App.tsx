import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Trash2, LogIn, LogOut, Sparkles, Edit2, X, Check, User, ArrowLeft, AlertCircle, Plus, Calendar, Camera, Loader2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const VIBES = [
  { id: 'lucid', emoji: '☁️', label: 'Lucid' },
  { id: 'scary', emoji: '👻', label: 'Scary' },
  { id: 'magical', emoji: '✨', label: 'Magical' },
  { id: 'bizarre', emoji: '🌀', label: 'Bizarre' },
  { id: 'peaceful', emoji: '🌿', label: 'Peaceful' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
];

const getFriendlyErrorMessage = (error: any) => {
  if (!error) return 'An unknown error occurred.';
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('invalid login credentials')) return 'Invalid email or password. Please check your credentials and try again.';
  if (msg.includes('user already exists')) return 'An account with this email already exists.';
  if (msg.includes('failed to fetch') || msg.includes('network error')) return 'Network error. Please check your internet connection.';
  if (msg.includes('row level security')) return 'You do not have permission to perform this action.';
  if (msg.includes('email not confirmed')) return 'Please verify your email address before signing in.';
  if (msg.includes('password should be at least')) return 'Password is too weak. It must be at least 6 characters long.';
  return error.message || 'An unexpected error occurred.';
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dreams, setDreams] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentView, setCurrentView] = useState<'journal' | 'profile' | 'settings'>('journal');
  const [appError, setAppError] = useState<string | null>(null);
  const [customVibes, setCustomVibes] = useState<any[]>([]);
  const [isAddingVibe, setIsAddingVibe] = useState(false);
  const [newVibeEmoji, setNewVibeEmoji] = useState('✨');
  const [newVibeLabel, setNewVibeLabel] = useState('');
  const [isSavingVibe, setIsSavingVibe] = useState(false);
  const [dreamDate, setDreamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 250;
            const MAX_HEIGHT = 250;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: dataUrl }
      });
      
      if (error) throw error;
      setUser(data.user);
    } catch (error) {
      showError(getFriendlyErrorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const showError = (msg: string) => {
    setAppError(msg);
    setTimeout(() => setAppError(null), 5000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setDreams([]);
      return;
    }

    const fetchDreams = async () => {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        showError(getFriendlyErrorMessage(error));
      } else {
        setDreams(data || []);
      }
    };

    const fetchVibes = async () => {
      const { data, error } = await supabase
        .from('custom_vibes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (!error) {
        setCustomVibes(data || []);
      }
    };

    fetchDreams();
    fetchVibes();

    const channel = supabase
      .channel('dreams_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'dreams', filter: `user_id=eq.${user.id}` }, 
        () => {
          fetchDreams();
        }
      )
      .subscribe();

    const vibesChannel = supabase
      .channel('vibes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'custom_vibes', filter: `user_id=eq.${user.id}` }, 
        () => {
          fetchVibes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(vibesChannel);
    };
  }, [user, isAuthReady]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Success! Please check your email for a confirmation link (if enabled in Supabase).');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(getFriendlyErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleSaveVibe = async () => {
    if (!newVibeEmoji.trim() || !newVibeLabel.trim() || !user) return;
    setIsSavingVibe(true);
    try {
      const { error } = await supabase.from('custom_vibes').insert([{
        emoji: newVibeEmoji.trim(),
        label: newVibeLabel.trim(),
        user_id: user.id
      }]);
      if (error) throw error;
      
      setNewVibeEmoji('✨');
      setNewVibeLabel('');
      setIsAddingVibe(false);
    } catch (error) {
      showError(getFriendlyErrorMessage(error));
    } finally {
      setIsSavingVibe(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim() || !selectedVibe || !user) return;

    const now = new Date();
    const [year, month, day] = dreamDate.split('-');
    const dateToSave = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds());
    const isoDate = dateToSave.toISOString();

    const optimisticDream = {
      id: `temp-${Date.now()}`,
      text: text.trim(),
      vibe: selectedVibe.label,
      vibe_emoji: selectedVibe.emoji,
      user_id: user.id,
      created_at: isoDate,
      isOptimistic: true
    };

    // Optimistic update
    setDreams(prev => [optimisticDream, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setText('');
    setSelectedVibe(null);
    setDreamDate(format(new Date(), 'yyyy-MM-dd'));

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('dreams').insert([{
        text: optimisticDream.text,
        vibe: optimisticDream.vibe,
        vibe_emoji: optimisticDream.vibe_emoji,
        user_id: optimisticDream.user_id,
        created_at: optimisticDream.created_at
      }]);
      
      if (error) throw error;
    } catch (error) {
      // Rollback
      setDreams(prev => prev.filter(d => d.id !== optimisticDream.id));
      showError(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousDreams = [...dreams];
    setDreams(prev => prev.filter(d => d.id !== id));

    try {
      const { error } = await supabase.from('dreams').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      // Rollback
      setDreams(previousDreams);
      showError(getFriendlyErrorMessage(error));
    }
  };

  const handleEditStart = (dream: any) => {
    setEditingId(dream.id);
    setEditText(dream.text);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) return;
    
    // Optimistic update
    const previousDreams = [...dreams];
    setDreams(prev => prev.map(d => d.id === id ? { ...d, text: editText.trim() } : d));
    
    const savedText = editText.trim();
    setEditingId(null);
    setEditText('');

    try {
      const { error } = await supabase.from('dreams').update({ text: savedText }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      // Rollback
      setDreams(previousDreams);
      showError(getFriendlyErrorMessage(error));
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0f24] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#b39ddb]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050814] text-slate-200 font-sans relative overflow-hidden selection:bg-[#b39ddb]/30">
      <AnimatePresence>
        {appError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-red-500/90 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border border-red-400/50 max-w-md"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium leading-snug">{appError}</p>
            <button onClick={() => setAppError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0 ml-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Starry background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b39ddb]/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl">
              <Sparkles className="w-6 h-6 text-[#b39ddb]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Dream Journal</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {currentView === 'profile' ? (
                <button
                  onClick={() => setCurrentView('journal')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : currentView === 'settings' ? (
                <button
                  onClick={() => setCurrentView('profile')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <button
                  onClick={() => setCurrentView('profile')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium backdrop-blur-sm"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  Profile
                </button>
              )}
            </div>
          )}
        </header>

        {user ? (
          <main className="space-y-10">
            {currentView === 'profile' ? (
              <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8e7cc3] to-[#b39ddb] flex items-center justify-center shadow-lg overflow-hidden border-2 border-transparent group-hover:border-white/20 transition-all">
                        {isUploadingAvatar ? (
                          <Loader2 className="w-6 h-6 text-black animate-spin" />
                        ) : user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-black" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Your Profile</h2>
                      <p className="text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all text-sm font-medium text-red-400 backdrop-blur-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                    <p className="text-sm text-slate-400 mb-1">Account ID</p>
                    <p className="text-xs font-mono text-slate-300 break-all">{user.id}</p>
                  </div>
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                    <p className="text-sm text-slate-400 mb-1">Joined</p>
                    <p className="text-sm font-medium text-slate-200">
                      {user.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-5 sm:col-span-2">
                    <p className="text-sm text-slate-400 mb-1">Total Dreams Logged</p>
                    <p className="text-3xl font-bold text-[#b39ddb]">{dreams.length}</p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Settings</h3>
                  
                  <button
                    onClick={() => setCurrentView('settings')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/30 rounded-lg group-hover:bg-[#b39ddb]/20 transition-colors">
                        <Settings className="w-5 h-5 text-slate-300 group-hover:text-[#b39ddb] transition-colors" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-white">History Settings</h3>
                        <p className="text-xs text-slate-400">View your complete dream history from day one</p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-slate-500 rotate-180 group-hover:text-white transition-colors" />
                  </button>

                  <p className="text-sm text-slate-400">
                    Password resets and email updates can be managed securely through your Supabase dashboard.
                  </p>
                </div>
              </section>
            ) : currentView === 'settings' ? (
              <section className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-black/30 rounded-2xl border border-white/5">
                      <Calendar className="w-6 h-6 text-[#b39ddb]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Full Dream History</h2>
                      <p className="text-slate-400">Every dream you've ever logged, from day one to today.</p>
                    </div>
                  </div>
                </div>

                {dreams.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Your journal is empty. Log your first dream to see it here.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(
                      dreams.reduce((acc: any, dream: any) => {
                        const date = format(new Date(dream.created_at), 'MMMM d, yyyy');
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(dream);
                        return acc;
                      }, {})
                    ).map(([date, dayDreams]: [string, any]) => (
                      <div key={date} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <Calendar className="w-4 h-4 text-[#b39ddb]" />
                          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{date}</h3>
                        </div>
                        <div className="grid gap-4">
                          <AnimatePresence>
                            {dayDreams.map((dream: any) => (
                              <motion.div
                                key={dream.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-xl border border-white/5">
                                      {dream.vibe_emoji}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{dream.vibe}</p>
                                      <p className="text-xs text-slate-400">
                                        {dream.created_at ? format(new Date(dream.created_at), 'h:mm a') : 'Just now'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    {editingId === dream.id ? (
                                      <>
                                        <button
                                          onClick={() => handleEditSave(dream.id)}
                                          className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                          aria-label="Save changes"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={handleEditCancel}
                                          className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                                          aria-label="Cancel editing"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEditStart(dream)}
                                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                          aria-label="Edit entry"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmation(dream.id)}
                                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                          aria-label="Delete entry"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {editingId === dream.id ? (
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b39ddb]/50 focus:border-transparent resize-none h-24 mt-2 transition-all"
                                    autoFocus
                                  />
                                ) : (
                                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mt-2">
                                    {dream.text}
                                  </p>
                                )}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Input Section */}
                <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-medium text-white">Log a dream</h2>
                    <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 w-fit">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={dreamDate}
                        onChange={(e) => setDreamDate(e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        className="bg-transparent text-sm text-slate-200 focus:outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                      />
                    </div>
                  </div>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="I was flying over a neon city..."
                className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b39ddb]/50 focus:border-transparent resize-none h-32 transition-all"
              />

              <div className="mt-6">
                <p className="text-sm font-medium text-slate-400 mb-3">How did it feel?</p>
                <div className="flex flex-wrap gap-3">
                  {[...VIBES, ...customVibes].map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => setSelectedVibe(vibe)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                        selectedVibe?.id === vibe.id
                          ? 'bg-[#b39ddb]/20 border-[#b39ddb]/50 text-white shadow-[0_0_15px_rgba(179,157,219,0.2)]'
                          : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-lg">{vibe.emoji}</span>
                      <span className="text-sm font-medium">{vibe.label}</span>
                    </button>
                  ))}

                  {isAddingVibe ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[#b39ddb]/50 bg-black/40 shadow-[0_0_10px_rgba(179,157,219,0.1)]">
                      <input
                        value={newVibeEmoji}
                        onChange={(e) => setNewVibeEmoji(e.target.value)}
                        className="w-8 bg-transparent text-lg text-center focus:outline-none"
                        placeholder="✨"
                        maxLength={2}
                      />
                      <div className="w-px h-4 bg-white/20"></div>
                      <input
                        value={newVibeLabel}
                        onChange={(e) => setNewVibeLabel(e.target.value)}
                        className="w-24 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                        placeholder="Vibe name"
                        maxLength={15}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveVibe}
                        disabled={isSavingVibe || !newVibeLabel.trim() || !newVibeEmoji.trim()}
                        className="p-1 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsAddingVibe(false)}
                        className="p-1 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingVibe(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">New</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!text.trim() || !selectedVibe || isSubmitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8e7cc3] to-[#b39ddb] text-black font-semibold shadow-lg hover:shadow-[#b39ddb]/25 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Journal'}
                </button>
              </div>
            </section>

            {/* Entries Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-semibold text-white">Recent Dreams</h2>
                {dreams.length > 3 && (
                  <button 
                    onClick={() => setCurrentView('settings')}
                    className="text-sm text-[#b39ddb] hover:text-white transition-colors"
                  >
                    View all history
                  </button>
                )}
              </div>
              
              {dreams.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Your journal is empty. Log your first dream above.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(
                    dreams.slice(0, 5).reduce((acc: any, dream: any) => {
                      const date = format(new Date(dream.created_at), 'MMMM d, yyyy');
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(dream);
                      return acc;
                    }, {})
                  ).map(([date, dayDreams]: [string, any]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <Calendar className="w-4 h-4 text-[#b39ddb]" />
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{date}</h3>
                      </div>
                      <div className="grid gap-4">
                        <AnimatePresence>
                          {dayDreams.map((dream: any) => (
                            <motion.div
                              key={dream.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-xl border border-white/5">
                                    {dream.vibe_emoji}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">{dream.vibe}</p>
                                    <p className="text-xs text-slate-400">
                                      {dream.created_at ? format(new Date(dream.created_at), 'h:mm a') : 'Just now'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {editingId === dream.id ? (
                              <>
                                <button
                                  onClick={() => handleEditSave(dream.id)}
                                  className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                  aria-label="Save changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleEditCancel}
                                  className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                                  aria-label="Cancel editing"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditStart(dream)}
                                  className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                  aria-label="Edit entry"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation(dream.id)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  aria-label="Delete entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {editingId === dream.id ? (
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b39ddb]/50 focus:border-transparent resize-none h-24 mt-2 transition-all"
                            autoFocus
                          />
                        ) : (
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mt-2">
                            {dream.text}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            </>
            )}
          </main>
        ) : (
          <div className="max-w-md mx-auto py-12 px-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#8e7cc3] to-[#b39ddb] rounded-full blur-xl opacity-50 mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Unlock your subconscious</h2>
            <p className="text-slate-400 text-center mb-8">
              Sign in to start logging your dreams, tracking your vibes, and exploring your midnight adventures.
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">{authError}</div>}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b39ddb]/50"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b39ddb]/50"
                required
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#8e7cc3] to-[#b39ddb] text-black font-semibold shadow-lg hover:shadow-[#b39ddb]/25 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {authLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-[#b39ddb] hover:text-white transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Dream?</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this dream? This action cannot be undone and it will be permanently erased.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete(deleteConfirmation);
                    setDeleteConfirmation(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-colors border border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
