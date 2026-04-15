/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, Timestamp, addDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider } from './firebase';
import { Tip, UserProfile, Sport, Notification } from './types';
import { Header, BottomNav, Sidebar } from './components/Navigation';
import { TipCard } from './components/TipCard';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { AdminUserList } from './components/AdminUserList';
import { NotificationsView } from './components/NotificationsView';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, TrendingUp, Clock, ChevronRight, CheckCircle2, Share2, Trash2, Edit2, Plus, AlertTriangle, RefreshCcw, LogOut, Settings, Shield, HelpCircle, User as UserIcon, Search, Home as HomeIcon, Info, Star, Filter, Calendar, LogIn, Copy, BarChart3, Target, Trophy, Dribbble, Circle, Save, X as CloseIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { signInWithPopup, signOut, AuthProvider } from 'firebase/auth';

// Error Handling Types
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    const { hasError, errorInfo } = this.state;
    const { children } = this.props;

    if (hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(errorInfo || '{}');
        if (parsed.error?.includes('insufficient permissions')) {
          displayMessage = "You don't have permission to perform this action. Please make sure you are logged in as an admin.";
        }
      } catch (e) {}

      return (
        <div className="h-screen flex flex-col items-center justify-center bg-dark-bg p-6 text-center">
          <AlertTriangle size={48} className="text-neon-red mb-4" />
          <h2 className="text-xl font-bold mb-2">Application Error</h2>
          <p className="text-white/60 mb-6">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue text-dark-bg px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            <RefreshCcw size={18} />
            Retry
          </button>
        </div>
      );
    }
    return children;
  }
}

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
    >
      <img 
        src="https://i.postimg.cc/xj74Jd3W/splash-image.gif" 
        alt="Splash Background" 
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </motion.div>
  );
};

// Pages
const TipDetail: React.FC<{ tips: Tip[]; userProfile: UserProfile | null; onToggleFavorite: (id: string) => void; onMenuClick: () => void; notifications: Notification[] }> = ({ tips, userProfile, onToggleFavorite, onMenuClick, notifications }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tip = tips.find(t => t.id === id);
  const [copied, setCopied] = useState(false);

  if (!tip) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-dark-bg p-6 text-center">
        <AlertTriangle size={48} className="text-neon-red mb-4" />
        <h2 className="text-xl font-bold mb-2">Tip Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-blue font-bold">Go Back</button>
      </div>
    );
  }

  const isFavorite = userProfile?.favorites.includes(tip.id);

  const handleCopy = () => {
    const text = `Darmz Tip: ${tip.home} vs ${tip.away}\nPrediction: ${tip.tip}\nOdds: ${tip.odds.toFixed(2)}\nConfidence: ${tip.confidence}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pb-32"
    >
      <Header title="Tip Details" onMenuClick={onMenuClick} notifications={notifications} />

      <div className="p-4">
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded">
              {tip.sport} • {tip.league}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold mb-3 leading-tight tracking-tight">
            {tip.home} <span className="text-white/20 font-medium">vs</span> {tip.away}
          </h1>
          
          <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
            <Calendar size={14} />
            <span>{tip.date.toDate().toLocaleDateString()} at {tip.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="text-center">
              <span className="block text-[10px] uppercase text-white/40 font-bold mb-1">Odds</span>
              <span className="text-xl font-mono font-bold text-white">{tip.odds.toFixed(2)}</span>
            </div>
            <div className="text-center border-x border-white/10">
              <span className="block text-[10px] uppercase text-white/40 font-bold mb-1">Conf.</span>
              <span className="text-xl font-bold text-blue">{tip.confidence}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] uppercase text-white/40 font-bold mb-1">Value</span>
              <span className="text-xl font-bold text-white">{(tip.odds * (tip.confidence / 100)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue" />
            <h3 className="text-lg font-bold uppercase tracking-tight">Expert Analysis</h3>
          </div>
          <div className="glass-card p-6 text-white/80 leading-relaxed whitespace-pre-wrap">
            {tip.reasoning}
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleCopy}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {copied ? <CheckCircle2 size={20} className="text-blue" /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy Tip'}
          </button>
          <button className="btn-gradient flex items-center justify-center gap-2 transition-all active:scale-95">
            <Share2 size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const HomeView: React.FC<{ tips: Tip[]; userProfile: UserProfile | null; isAdmin: boolean; onToggleFavorite: (id: string) => void; onDelete: (id: string) => void; onUpdateStatus: (id: string, status: 'active' | 'won' | 'lost') => void; onMenuClick: () => void; notifications: Notification[] }> = ({ tips, userProfile, isAdmin, onToggleFavorite, onDelete, onUpdateStatus, onMenuClick, notifications }) => {
  const navigate = useNavigate();
  const [activeDate, setActiveDate] = useState<'Yesterday' | 'Today' | 'Tomorrow'>('Today');

  const getFilteredTips = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return tips.filter(tip => {
      const tipDate = tip.date.toDate();
      tipDate.setHours(0, 0, 0, 0);
      if (activeDate === 'Today') return tipDate.getTime() === today.getTime();
      if (activeDate === 'Yesterday') return tipDate.getTime() === yesterday.getTime();
      if (activeDate === 'Tomorrow') return tipDate.getTime() === tomorrow.getTime();
      return true;
    });
  };

  const filteredTips = getFilteredTips();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <Header title="Darmz Football Tips" showLogo onMenuClick={onMenuClick} notifications={notifications} />
      
      <div className="px-6 py-4 overflow-x-auto flex gap-2 no-scrollbar">
        {['Yesterday', 'Today', 'Tomorrow'].map(date => (
          <button
            key={date}
            onClick={() => setActiveDate(date as any)}
            className={clsx(
              "px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
              activeDate === date 
                ? "bg-blue text-white" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {date}
          </button>
        ))}
      </div>

      <div className="py-6">
        <h2 className="px-6 text-xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="text-neon-red" size={20} />
          {activeDate}'s Matches & Tips
        </h2>
        
        <div className="space-y-0">
          {filteredTips.map(tip => (
            <TipCard 
              key={tip.id} 
              tip={tip} 
              isFavorite={userProfile?.favorites.includes(tip.id)}
              onToggleFavorite={onToggleFavorite}
              showDelete={isAdmin}
              onDelete={onDelete}
              onUpdateStatus={onUpdateStatus}
              isAdmin={isAdmin}
              onClick={() => navigate(`/tip/${tip.id}`)}
            />
          ))}
          {filteredTips.length === 0 && (
            <div className="text-center py-20 text-white/20">
              <p>No tips found for {activeDate}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Discover: React.FC<{ tips: Tip[]; userProfile: UserProfile | null; isAdmin: boolean; onToggleFavorite: (id: string) => void; onDelete: (id: string) => void; onMenuClick: () => void; notifications: Notification[] }> = ({ tips, userProfile, isAdmin, onToggleFavorite, onDelete, onMenuClick, notifications }) => {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState<string>('All');
  const sports = [
    { name: 'All', icon: <Target size={16} /> },
    { name: 'Football', icon: <Trophy size={16} /> },
    { name: 'Basketball', icon: <Dribbble size={16} /> },
    { name: 'Tennis', icon: <Circle size={16} /> },
    { name: 'Cricket', icon: <Circle size={16} /> }
  ];

  const filteredTips = activeSport === 'All' 
    ? tips 
    : tips.filter(t => t.sport === activeSport);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <Header title="Discover" onMenuClick={onMenuClick} notifications={notifications} />
      
      <div className="px-6 py-4 overflow-x-auto flex gap-2 no-scrollbar">
        {sports.map(sport => (
          <button
            key={sport.name}
            onClick={() => setActiveSport(sport.name)}
            className={clsx(
              "px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
              activeSport === sport.name 
                ? (sport.name === 'All' ? "bg-yellowish-green text-dark-bg" : sport.name === 'Football' ? "bg-blue text-white" : sport.name === 'Basketball' ? "bg-orange text-white" : "bg-yellowish-green text-dark-bg")
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {sport.icon}
            {sport.name}
          </button>
        ))}
      </div>

      <div className="py-4">
        <div className="px-6 flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Latest {activeSport !== 'All' ? activeSport : ''} Tips</h2>
          <button className="text-white/40 hover:text-white">
            <Filter size={20} />
          </button>
        </div>

        <div className="space-y-0">
          {filteredTips.map(tip => (
            <TipCard 
              key={tip.id} 
              tip={tip} 
              isFavorite={userProfile?.favorites.includes(tip.id)}
              onToggleFavorite={onToggleFavorite}
              showDelete={isAdmin}
              onDelete={onDelete}
              onClick={() => navigate(`/tip/${tip.id}`)}
            />
          ))}
          {filteredTips.length === 0 && (
            <div className="text-center py-20 text-white/20">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>No tips found for this category</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Profile: React.FC<{ user: User | null; userProfile: UserProfile | null; isAdmin: boolean; onMenuClick: () => void }> = ({ user, userProfile, isAdmin, onMenuClick }) => {
  const navigate = useNavigate();
  const handleLogin = async (provider: AuthProvider) => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <Header title="Profile" onMenuClick={onMenuClick} />
      
      <div className="px-6 py-10 text-center">
        {user ? (
          <>
            <div className="w-24 h-24 rounded-full border-2 border-blue p-1 mx-auto mb-4">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold mb-1">{user.displayName}</h2>
            <p className="text-white/40 mb-8">{user.email}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass-card p-4">
                <span className="text-3xl font-bold text-blue">84%</span>
                <p className="text-[10px] uppercase font-bold text-white/40 mt-1">Win Rate</p>
              </div>
              <div className="glass-card p-4">
                <span className="text-3xl font-bold text-white">{userProfile?.favorites.length || 0}</span>
                <p className="text-[10px] uppercase font-bold text-white/40 mt-1">Tips Saved</p>
              </div>
            </div>

            <div className="space-y-3">
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-blue/30"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-blue" />
                    <span className="font-bold">Admin Dashboard</span>
                  </div>
                  <ChevronRight size={20} className="text-white/20" />
                </button>
              )}
              <button className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Star size={20} className="text-yellow-400" />
                  <span className="font-bold">Upgrade to Pro</span>
                </div>
                <ChevronRight size={20} className="text-white/20" />
              </button>
              <button className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Info size={20} className="text-white/40" />
                  <span className="font-bold">Help & Support</span>
                </div>
                <ChevronRight size={20} className="text-white/20" />
              </button>
              <button 
                onClick={handleLogout}
                className="w-full p-4 flex items-center justify-center gap-2 text-neon-red font-bold mt-8"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon size={40} className="text-white/20" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Join Darmz Tips</h2>
            <p className="text-white/40 mb-8">Save your favorite tips and track your success rate.</p>
            <button 
              onClick={() => handleLogin(googleProvider)}
              className="w-full bg-white text-dark-bg font-bold py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform mb-4"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V6.92H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 5.08l3.66-2.99z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.92l3.66 2.99c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button 
              onClick={() => handleLogin(facebookProvider)}
              className="w-full bg-[#1877F2] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="white"/>
              </svg>
              Continue with Facebook
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Favorites: React.FC<{ tips: Tip[]; userProfile: UserProfile | null; isAdmin: boolean; onToggleFavorite: (id: string) => void; onDelete: (id: string) => void; onMenuClick: () => void; notifications: Notification[] }> = ({ tips, userProfile, isAdmin, onToggleFavorite, onDelete, onMenuClick, notifications }) => {
  const navigate = useNavigate();
  const favoriteTips = tips.filter(t => userProfile?.favorites.includes(t.id));

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <Header title="Favorites" onMenuClick={onMenuClick} notifications={notifications} />
      
      <div className="py-6">
        {favoriteTips.length > 0 ? (
          <div className="space-y-0">
            {favoriteTips.map(tip => (
              <TipCard 
                key={tip.id} 
                tip={tip} 
                isFavorite={true}
                showDelete={isAdmin}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onClick={() => navigate(`/tip/${tip.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 text-center py-32 text-white/20">
            <Heart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold mb-2">No Favorites Yet</p>
            <p className="text-sm">Save tips you like to see them here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const History: React.FC<{ tips: Tip[]; userProfile: UserProfile | null; isAdmin: boolean; onToggleFavorite: (id: string) => void; onDelete: (id: string) => void; onMenuClick: () => void; notifications: Notification[] }> = ({ tips, userProfile, isAdmin, onToggleFavorite, onDelete, onMenuClick, notifications }) => {
  const navigate = useNavigate();
  
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  const historyTips = tips.filter(t => {
    const tipDate = t.date.toDate();
    return t.status !== 'active' && tipDate >= fiveDaysAgo;
  });

  const groupedTips = historyTips.reduce((acc, tip) => {
    const date = tip.date.toDate().toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(tip);
    return acc;
  }, {} as Record<string, Tip[]>);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <Header title="History" onMenuClick={onMenuClick} notifications={notifications} />
      
      <div className="py-6">
        {Object.keys(groupedTips).length > 0 ? (
          Object.entries(groupedTips).map(([date, tips]) => (
            <div key={date} className="mb-8">
              <h3 className="px-6 text-xs font-black uppercase tracking-widest text-white/40 mb-4">{date}</h3>
              <div className="space-y-0">
                {tips.map(tip => (
                  <TipCard 
                    key={tip.id} 
                    tip={tip} 
                    isFavorite={userProfile?.favorites.includes(tip.id)}
                    showDelete={isAdmin}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onClick={() => navigate(`/tip/${tip.id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 text-center py-32 text-white/20">
            <Clock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold mb-2">No History Yet</p>
            <p className="text-sm">Past tips from the last 5 days will appear here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DisclaimerModal: React.FC<{ onAccept: () => void }> = ({ onAccept }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-black/90 backdrop-blur-sm">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-card p-8 max-w-sm w-full text-center"
    >
      <div className="w-16 h-16 bg-neon-red/10 text-neon-red rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-4">Responsible Gambling</h2>
      <p className="text-white/60 mb-8 leading-relaxed">
        18+ | For entertainment only. Gamble responsibly. We do not promote betting or handle real money transactions.
      </p>
      <button 
        onClick={onAccept}
        className="btn-gradient w-full py-4 active:scale-95 transition-transform"
      >
        I UNDERSTAND
      </button>
    </motion.div>
  </div>
);

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-dark-bg">
      <div className="w-full max-w-sm glass-card p-8">
        <h2 className="text-2xl font-black mb-6 text-center italic tracking-tighter">ADMIN ACCESS</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-green outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-green outline-none transition-all"
              required
            />
          </div>
          {error && <p className="text-neon-red text-xs font-bold">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-neon-green text-dark-bg font-black py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>
        <button 
          onClick={() => navigate('/')}
          className="w-full mt-4 text-white/40 text-sm font-bold hover:text-white"
        >
          Back to App
        </button>
      </div>
    </div>
  );
};

const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-card p-6 w-full max-w-sm">
        <h3 className="text-lg font-black mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/5 font-bold text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-neon-red font-bold text-sm text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC<{ tips: Tip[]; isAdmin: boolean; onMenuClick: () => void; user: User | null }> = ({ tips, isAdmin, onMenuClick, user }) => {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [activeTab, setActiveTab] = useState<'tips' | 'users'>('tips');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | null; type: 'single' | 'all' }>({ id: null, type: 'single' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTips = tips.filter(tip => 
    tip.home.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tip.away.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.sport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-dark-bg">
        <AlertTriangle size={48} className="text-neon-red mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-white/40 mb-6">You do not have permission to view this page.</p>
        <button onClick={() => navigate('/')} className="text-blue font-bold">Return Home</button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tips', id));
      setConfirmDelete({ id: null, type: 'single' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tips/${id}`);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const tipsSnapshot = await getDocs(collection(db, 'tips'));
      const batch = writeBatch(db);
      tipsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setConfirmDelete({ id: null, type: 'all' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tips');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col"
    >
      <Header title="Admin Panel" onMenuClick={onMenuClick} />
      
      <ConfirmModal 
        isOpen={confirmDelete.id !== null || confirmDelete.type === 'all'}
        title="Confirm Deletion"
        message={confirmDelete.type === 'all' ? "Are you sure you want to delete ALL tips? This action cannot be undone." : "Are you sure you want to delete this tip?"}
        onConfirm={() => confirmDelete.type === 'all' ? handleDeleteAll() : confirmDelete.id && handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ id: null, type: 'single' })}
      />
      
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-card p-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Total Tips</p>
            <p className="text-xl font-black">{tips.length}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Active Tab</p>
            <p className="text-xl font-black capitalize">{activeTab}</p>
          </div>
        </div>

        <div className="bg-white/5 p-1 rounded-xl flex gap-1">
          {['tips', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={clsx(
                "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === tab 
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        
        {activeTab === 'tips' && (
          <input 
            type="text"
            placeholder="Search tips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mt-4 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white outline-none"
          />
        )}
      </div>

      <div className="p-4">
        {activeTab === 'tips' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black italic tracking-tighter">MANAGE TIPS ({filteredTips.length})</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmDelete({ id: 'all', type: 'all' })}
                  className="bg-red/20 text-red p-2 rounded-lg hover:bg-red/30 transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="btn-gradient p-2"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTips.map(tip => (
                <div key={tip.id} className="glass-card p-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{tip.home} vs {tip.away}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{tip.sport} • {tip.league}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingTip(tip)}
                      className="p-1.5 text-white/40 hover:text-neon-green"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setEditingTip({ ...tip, id: '' })}
                      className="p-1.5 text-white/40 hover:text-blue"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => setConfirmDelete({ id: tip.id, type: 'single' })}
                      className="p-1.5 text-white/40 hover:text-neon-red"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full">
            <AdminUserList user={user} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingTip) && (
          <TipForm 
            tip={editingTip} 
            onClose={() => {
              setIsAdding(false);
              setEditingTip(null);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TipForm: React.FC<{ tip: Tip | null; onClose: () => void }> = ({ tip, onClose }) => {
  const [formData, setFormData] = useState<Partial<Tip>>(
    tip ? { ...tip } : {
      sport: 'Football',
      league: '',
      home: '',
      away: '',
      tip: '',
      odds: 1.5,
      confidence: 75,
      reasoning: '',
      expected_value: 0,
      image_url: '',
      isHot: false,
      status: 'active',
      date: Timestamp.now()
    }
  );
  const [loading, setLoading] = useState(false);
  const leagueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    leagueInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    console.log("Submitting tip:", formData);
    try {
      if (tip && tip.id) {
        console.log("Updating tip:", tip.id);
        // Ensure all required fields are present
        const { id, ...dataToSave } = formData as Tip;
        await updateDoc(doc(db, 'tips', tip.id), dataToSave);
      } else {
        console.log("Adding new tip");
        // Ensure id is not included in the new document
        const { id, ...dataToSave } = formData as Tip;
        const docRef = await addDoc(collection(db, 'tips'), dataToSave);
        console.log("Tip added with ID:", docRef.id);
      }
      console.log("Tip saved successfully");
      onClose();
    } catch (error) {
      console.error("Error saving tip:", error);
      handleFirestoreError(error, tip && tip.id ? OperationType.UPDATE : OperationType.CREATE, tip && tip.id ? `tips/${tip.id}` : 'tips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md overflow-y-auto p-6"
    >
      <div className="w-full glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black italic tracking-tighter">{tip ? 'EDIT TIP' : 'NEW TIP'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <CloseIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Sport</label>
              <select 
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value as Sport })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
              >
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Cricket">Cricket</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Date</label>
              <input 
                type="date"
                value={formData.date ? new Date(formData.date.toMillis()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({...formData, date: Timestamp.fromDate(new Date(e.target.value))})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Time</label>
              <input 
                type="time"
                value={formData.matchTime || ''}
                onChange={(e) => setFormData({...formData, matchTime: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">League</label>
              <input 
                ref={leagueInputRef}
                type="text" 
                value={formData.league}
                onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Home Team</label>
              <input 
                type="text" 
                value={formData.home}
                onChange={(e) => setFormData({ ...formData, home: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Away Team</label>
              <input 
                type="text" 
                value={formData.away}
                onChange={(e) => setFormData({ ...formData, away: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    formData.status === 'active' ? "bg-white/20 text-white" : "bg-white/5 text-white/40"
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'won' })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform hover:scale-105",
                    formData.status === 'won' 
                      ? "bg-gradient-to-br from-neon-green/90 via-neon-green to-emerald-600 text-white border border-neon-green/50 shadow-[0_0_20px_rgba(57,255,20,0.4)]" 
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  🟩 Won
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'lost' })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform hover:scale-105",
                    formData.status === 'lost' 
                      ? "bg-gradient-to-r from-neon-red/80 to-neon-red text-white border border-neon-red/50 shadow-[0_0_15px_rgba(255,49,49,0.3)]" 
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  🟥 Lost
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Prediction</label>
            <input 
              type="text" 
              value={formData.tip}
              onChange={(e) => setFormData({ ...formData, tip: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Odds</label>
              <input 
                type="number" 
                step="0.01"
                value={isNaN(formData.odds as number) ? '' : formData.odds}
                onChange={(e) => setFormData({ ...formData, odds: parseFloat(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Confidence %</label>
              <input 
                type="number" 
                value={isNaN(formData.confidence as number) ? '' : formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
              <span>Expert Reasoning (Optional)</span>
              <span>{(formData.reasoning?.length || 0)} / 500</span>
            </label>
            <textarea 
              value={formData.reasoning || ''}
              onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none h-32 resize-none focus:border-blue transition-all"
              maxLength={500}
            />
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="isHot"
              checked={formData.isHot}
              onChange={(e) => setFormData({ ...formData, isHot: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-green focus:ring-neon-green"
            />
            <label htmlFor="isHot" className="text-sm font-bold">Mark as HOT Tip</label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'SAVING...' : 'SAVE TIP'}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const tipsRef = useRef<Tip[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [tipToDelete, setTipToDelete] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('darmz_disclaimer_accepted');
    if (!hasAccepted) setShowDisclaimer(true);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          let profile: UserProfile;
          if (userDoc.exists()) {
            profile = userDoc.data() as UserProfile;
          } else {
            profile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              favorites: [],
              role: currentUser.email === 'matovuedward69@gmail.com' ? 'admin' : 'user',
              createdAt: Timestamp.now()
            };
            await setDoc(userRef, profile);
          }
          setUserProfile(profile);
          setIsAdmin(profile.role === 'admin' || currentUser.email === 'matovuedward69@gmail.com');
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    tipsRef.current = tips;
  }, [tips]);

  useEffect(() => {
    const q = query(collection(db, 'tips'), orderBy('date', 'desc'));
    const unsubscribeTips = onSnapshot(q, (snapshot) => {
      console.log("Tips snapshot received:", snapshot.size);
      const tipsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tip[];
      
      console.log("Tips data:", tipsData);

      if (tipsRef.current.length > 0 && tipsData.length > tipsRef.current.length) {
        setToast('New tip added!');
        setTimeout(() => setToast(null), 3000);
      }
      
      setTips(tipsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tips');
    });

    return () => {
      unsubscribeTips();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const notificationsQ = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(notificationsQ, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Filter for 'all' or current user
      const userNotifications = notificationsData.filter(n => n.userId === 'all' || n.userId === user?.uid);
      setNotifications(userNotifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubscribeNotifications();
    };
  }, [user]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('darmz_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  const handleDelete = async () => {
    if (tipToDelete) {
      try {
        await deleteDoc(doc(db, 'tips', tipToDelete));
        setTipToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tips/${tipToDelete}`);
      }
    }
  };

  const handleToggleFavorite = async (tipId: string) => {
    if (!user) {
      // Redirect to profile or show login prompt
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const isFavorite = userProfile?.favorites.includes(tipId);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(tipId)
        });
        setUserProfile(prev => prev ? { ...prev, favorites: prev.favorites.filter(id => id !== tipId) } : null);
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(tipId)
        });
        setUserProfile(prev => prev ? { ...prev, favorites: [...prev.favorites, tipId] } : null);
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const handleUpdateStatus = async (tipId: string, status: 'active' | 'won' | 'lost') => {
    try {
      await updateDoc(doc(db, 'tips', tipId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tips/${tipId}`);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-neon-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      
      {!showSplash && (
        <Router>
          <div className="max-w-md mx-auto min-h-screen bg-dark-bg relative">
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)} 
              user={user}
              isAdmin={isAdmin}
              onLogout={handleLogout}
            />
            
            <AnimatePresence>
              {toast && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-6 right-6 bg-neon-green text-dark-bg p-4 rounded-2xl font-bold text-center z-[200]"
        >
          {toast}
        </motion.div>
      )}
      {tipToDelete && (
        <ConfirmDeleteModal 
          onConfirm={handleDelete} 
          onCancel={() => setTipToDelete(null)}
        />
      )}
            </AnimatePresence>

            <Routes>
              <Route path="/" element={<HomeView tips={tips} userProfile={userProfile} isAdmin={isAdmin} onToggleFavorite={handleToggleFavorite} onDelete={(id) => setTipToDelete(id)} onUpdateStatus={handleUpdateStatus} onMenuClick={() => setIsSidebarOpen(true)} notifications={notifications} />} />
              <Route path="/discover" element={<Discover tips={tips} userProfile={userProfile} isAdmin={isAdmin} onToggleFavorite={handleToggleFavorite} onDelete={(id) => setTipToDelete(id)} onMenuClick={() => setIsSidebarOpen(true)} notifications={notifications} />} />
              <Route path="/tip/:id" element={<TipDetail tips={tips} userProfile={userProfile} onToggleFavorite={handleToggleFavorite} onMenuClick={() => setIsSidebarOpen(true)} notifications={notifications} />} />
              <Route path="/favorites" element={<Favorites tips={tips} userProfile={userProfile} isAdmin={isAdmin} onToggleFavorite={handleToggleFavorite} onDelete={(id) => setTipToDelete(id)} onMenuClick={() => setIsSidebarOpen(true)} notifications={notifications} />} />
              <Route path="/history" element={<History tips={tips} userProfile={userProfile} isAdmin={isAdmin} onToggleFavorite={handleToggleFavorite} onDelete={(id) => setTipToDelete(id)} onMenuClick={() => setIsSidebarOpen(true)} notifications={notifications} />} />
              <Route path="/profile" element={<Profile user={user} userProfile={userProfile} isAdmin={isAdmin} onMenuClick={() => setIsSidebarOpen(true)} />} />
              <Route path="/admin" element={<AdminPanel tips={tips} isAdmin={isAdmin} onMenuClick={() => setIsSidebarOpen(true)} user={user} />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/notifications" element={<NotificationsView notifications={notifications} />} />
            </Routes>

            <BottomNav />
          </div>
        </Router>
      )}
    </ErrorBoundary>
  );
}
