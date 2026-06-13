import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, User } from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA3AYrTGRllXItN0XiRef_kjqai9fA5gpY",
  authDomain: "bhushan-play-store.firebaseapp.com",
  projectId: "bhushan-play-store",
  storageBucket: "bhushan-play-store.firebasestorage.app",
  messagingSenderId: "253165280875",
  appId: "1:253165280875:web:8c3168d1332a80f040db2e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Types
interface AppData {
  id: string;
  name: string;
  category: string;
  icon: string;
  desc: string;
  version: string;
  size: string;
  packageName: string;
  rating: number;
  screenshots?: string[];
  video_url?: string;
  downloadUrl?: string;
}

interface Review {
  userName: string;
  rating: number;
  comment: string;
  timestamp: number;
}

// Sample Apps
const SAMPLE_APPS: Record<string, AppData> = {
  app1: { id: "app1", name: "WhatsApp", category: "Social", icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg", desc: "Stay connected with friends and family worldwide. Send messages, make voice and video calls, share photos and documents.", version: "2.24.8", size: "45", packageName: "com.whatsapp", rating: 4.5, screenshots: ["https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300"] },
  app2: { id: "app2", name: "Instagram", category: "Social", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg", desc: "Share your photos and stories with friends.", version: "2.24.5", size: "68", packageName: "com.instagram.android", rating: 4.3, screenshots: [] },
  app3: { id: "app3", name: "Candy Crush", category: "Game", icon: "https://play-lh.googleusercontent.com/rlhI5HCZ2ehk5u4vCpuA1Uo8O2QD5f2SQy2SHGlDNz4-5mEVH6RVf-oHqAGlTEMan3Q=w240-h480-rw", desc: "Match candies and have fun!", version: "1.25.0", size: "120", packageName: "com.king.candycrushsaga", rating: 4.2, screenshots: [] },
  app4: { id: "app4", name: "Facebook", category: "Social", icon: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg", desc: "Connect with friends and family.", version: "4.2.0", size: "78", packageName: "com.facebook.katana", rating: 4.1, screenshots: [] },
  app5: { id: "app5", name: "YouTube", category: "Entertainment", icon: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg", desc: "Watch videos from around the world.", version: "18.0.0", size: "95", packageName: "com.google.android.youtube", rating: 4.6, screenshots: [] },
  app6: { id: "app6", name: "TikTok", category: "Entertainment", icon: "https://sf16-scmcdn-sg.ibytedtos.com/goofy/tiktok/web/node/_next/static/images/logo-7328701c910ebbccb5670085d243fc12.svg", desc: "Short videos, music, and more.", version: "28.0.0", size: "120", packageName: "com.zhiliaoapp.musically", rating: 4.4, screenshots: [] },
  app7: { id: "app7", name: "Spotify", category: "Music", icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg", desc: "Music streaming service.", version: "8.8.0", size: "85", packageName: "com.spotify.music", rating: 4.7, screenshots: [] },
  app8: { id: "app8", name: "Netflix", category: "Entertainment", icon: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg", desc: "Watch movies and TV shows.", version: "8.0.0", size: "110", packageName: "com.netflix.mediaclient", rating: 4.5, screenshots: [] }
};

// Utility Functions
const convertToRawUrl = (url: string): string => {
  if (!url) return url;
  if (url.includes('dropbox.com')) {
    let raw = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('?dl=1', '');
    if (!raw.includes('?raw=1')) raw += '?raw=1';
    return raw;
  }
  return url;
};

const isAppInstalled = (pkg: string, ver: string): boolean => {
  return localStorage.getItem(`installed_${pkg}`) === 'true' && localStorage.getItem(`version_${pkg}`) === ver;
};

const hasUpdate = (pkg: string, ver: string): boolean => {
  const installedVer = localStorage.getItem(`version_${pkg}`);
  return installedVer !== null && installedVer !== ver;
};

const markInstalled = (pkg: string, ver: string): void => {
  localStorage.setItem(`installed_${pkg}`, 'true');
  localStorage.setItem(`version_${pkg}`, ver);
};

const uninstallApp = (pkg: string): void => {
  localStorage.removeItem(`installed_${pkg}`);
  localStorage.removeItem(`version_${pkg}`);
};

// Toast Component
const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl text-white px-6 py-3 rounded-full text-sm z-[1000] border border-blue-500 animate-slideUp">
      {message}
    </div>
  );
};

// Flash Screen
const FlashScreen: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0f0f2a] to-[#020208] z-[9999] flex flex-col items-center justify-center transition-opacity duration-800">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-[0_0_45px_#3b82f6]">
        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
        </svg>
      </div>
      <h1 className="text-3xl mt-6 font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
        Roshan Pro Store
      </h1>
      <p className="text-gray-400 mt-2">BR.Technology Working Edition</p>
      <div className="flex gap-2 mt-5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
        ))}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [currentScreen, setCurrentScreen] = useState<string>('login');
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<Record<string, AppData>>(SAMPLE_APPS);
  const [banners, setBanners] = useState<string[]>([]);
  const [activeApp, setActiveApp] = useState<AppData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [downloadProgress, setDownloadProgress] = useState<{ visible: boolean; percent: number; status: string }>({ visible: false, percent: 0, status: '' });
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [, forceUpdate] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const categories = ['All', 'Social', 'Game', 'App', 'Tool', 'Entertainment', 'Music'];

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // Flash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowFlash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        setCurrentScreen('home');
      } else {
        setCurrentScreen('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load apps from Firebase
  useEffect(() => {
    const appsRef = ref(db, 'apps');
    const unsubscribe = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Object.keys(data).length > 0) {
        const processedApps: Record<string, AppData> = {};
        Object.entries(data).forEach(([key, value]) => {
          const appData = value as AppData;
          processedApps[key] = {
            ...appData,
            id: key,
            downloadUrl: appData.downloadUrl ? convertToRawUrl(appData.downloadUrl) : undefined
          };
        });
        setApps(processedApps);
      } else {
        setApps(SAMPLE_APPS);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load banners
  useEffect(() => {
    const bannersRef = ref(db, 'banners');
    const unsubscribe = onValue(bannersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bannerUrls = Object.values(data).map((b: unknown) => {
          const banner = b as { img?: string } | string;
          return typeof banner === 'string' ? banner : banner.img || '';
        });
        setBanners(bannerUrls.filter(Boolean));
      }
    });
    return () => unsubscribe();
  }, []);

  // Load reviews when app changes
  useEffect(() => {
    if (activeApp) {
      const reviewsRef = ref(db, `apps/${activeApp.id}/reviews`);
      const unsubscribe = onValue(reviewsRef, (snapshot) => {
        setReviews(snapshot.val() || {});
      });
      return () => unsubscribe();
    }
  }, [activeApp]);

  // Auth handlers
  const handleLogin = async () => {
    if (!loginEmail || !loginPass) {
      showToast('Please enter email & password');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
      showToast('Login successful! 🎉');
    } catch (e: unknown) {
      const error = e as { message: string };
      showToast(error.message);
    }
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail || !signupPass) {
      showToast('Please fill all fields');
      return;
    }
    if (signupPass !== signupConfirm) {
      showToast('Passwords do not match');
      return;
    }
    if (signupPass.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await createUserWithEmailAndPassword(auth, signupEmail, signupPass);
      await updateProfile(res.user, { displayName: signupName });
      await set(ref(db, `users/${res.user.uid}`), { name: signupName, email: signupEmail });
      showToast('Account created! Welcome! 🎉');
    } catch (e: unknown) {
      const error = e as { message: string };
      showToast(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen('login');
    showToast('Logged out successfully');
  };

  // Download and Install APK
  const downloadAndInstall = async (appData: AppData) => {
    setDownloadProgress({ visible: true, percent: 0, status: 'Preparing download...' });

    // Check if app has real download URL (Dropbox, Google Drive, etc.)
    const hasRealApk = appData.downloadUrl && 
      (appData.downloadUrl.includes('dropbox') || 
       appData.downloadUrl.includes('drive.google') || 
       appData.downloadUrl.includes('github') ||
       appData.downloadUrl.endsWith('.apk'));

    if (hasRealApk && appData.downloadUrl) {
      // Real APK download
      try {
        const rawUrl = convertToRawUrl(appData.downloadUrl);
        
        setDownloadProgress({ visible: true, percent: 5, status: 'Connecting to server...' });
        
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error('Download failed - Server error');
        
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to read response');
        
        const chunks: Uint8Array[] = [];
        let received = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          received += value.length;
          
          const percent = total > 0 ? Math.round((received / total) * 100) : 50;
          setDownloadProgress({
            visible: true,
            percent: Math.min(percent, 95),
            status: `Downloading... ${Math.round(received / 1024 / 1024 * 100) / 100} MB`
          });
        }
        
        setDownloadProgress({ visible: true, percent: 98, status: 'Processing APK...' });
        
        // Create blob and download
        const blob = new Blob(chunks as BlobPart[]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${appData.name.replace(/\s+/g, '_')}_v${appData.version}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setDownloadProgress({ visible: true, percent: 100, status: 'Download complete! Tap notification to install.' });
        
        // Mark as installed after download
        markInstalled(appData.packageName, appData.version);
        showToast(`${appData.name} APK downloaded! Check your downloads.`);
        
        setTimeout(() => {
          setDownloadProgress({ visible: false, percent: 0, status: '' });
          forceUpdate({});
        }, 3000);
        
      } catch (error: unknown) {
        const err = error as { message: string };
        console.error('Download error:', err);
        setDownloadProgress({ visible: false, percent: 0, status: '' });
        showToast(`Download failed: ${err.message}`);
      }
    } else {
      // Simulated download for apps without downloadUrl
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const remaining = ((100 - i) * 0.1).toFixed(1);
        setDownloadProgress({
          visible: true,
          percent: i,
          status: `Downloading ${i}% | ⏱️ ${remaining}s remaining`
        });
      }
      
      setDownloadProgress({ visible: true, percent: 100, status: 'Installing...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      markInstalled(appData.packageName, appData.version);
      showToast(`${appData.name} installed successfully! 🎉`);
      
      setDownloadProgress({ visible: false, percent: 0, status: '' });
      forceUpdate({});
    }
  };

  // Open installed app
  const openInstalledApp = (packageName: string, appName: string) => {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      showToast('Open feature only works on Android devices');
      return;
    }
    
    // Try Android intent
    try {
      window.location.href = `intent://#Intent;package=${packageName};end`;
      setTimeout(() => {
        window.location.href = `android-app://${packageName}`;
      }, 500);
      showToast(`Opening ${appName}...`);
    } catch {
      showToast(`Please open ${appName} manually`);
    }
  };

  // Uninstall app
  const handleUninstall = (appData: AppData) => {
    uninstallApp(appData.packageName);
    showToast(`${appData.name} uninstalled`);
    forceUpdate({});
  };

  // Get button state for app
  const getButtonState = (appData: AppData): { text: string; className: string; action: () => void } => {
    const installed = isAppInstalled(appData.packageName, appData.version);
    const needsUpdate = hasUpdate(appData.packageName, appData.version);

    if (needsUpdate) {
      return {
        text: '🔄 Update',
        className: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
        action: () => downloadAndInstall(appData)
      };
    }
    if (installed) {
      return {
        text: '▶️ Open',
        className: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
        action: () => openInstalledApp(appData.packageName, appData.name)
      };
    }
    return {
      text: '📥 Install',
      className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      action: () => downloadAndInstall(appData)
    };
  };

  // Filter apps by category and search
  const filteredApps = Object.fromEntries(
    Object.entries(apps).filter(([, app]) => {
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesSearch = !searchQuery || app.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
  );

  // Calculate average rating
  const calculateAvgRating = (): { avg: number; count: number } => {
    const reviewList = Object.values(reviews);
    if (reviewList.length === 0) return { avg: 0, count: 0 };
    const total = reviewList.reduce((sum, r) => sum + r.rating, 0);
    return { avg: total / reviewList.length, count: reviewList.length };
  };

  // Submit review
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const submitReview = () => {
    if (!user || !activeApp) {
      showToast('Please login to review');
      return;
    }
    if (selectedRating === 0) {
      showToast('Please select a rating');
      return;
    }

    const reviewRef = ref(db, `apps/${activeApp.id}/reviews/${user.uid}`);
    set(reviewRef, {
      userName: user.displayName || user.email?.split('@')[0] || 'User',
      rating: selectedRating,
      comment: reviewText,
      timestamp: Date.now()
    });

    showToast('Review submitted! ⭐');
    setSelectedRating(0);
    setReviewText('');
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-400'}>★</span>
    ));
  };

  // Screen Components
  const LoginScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-5 bg-white dark:bg-[#0a0a1a]">
      <div className="w-full max-w-sm">
        <div className="flex justify-between mb-8">
          <div className="w-12 h-12 bg-green-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm9-9a1 1 0 110 2h-1a1 1 0 110-2h1zM5 12a1 1 0 110 2H4a1 1 0 110-2h1z"/></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
            )}
          </button>
        </div>
        <h1 className="text-3xl font-bold mb-2 dark:text-white">Welcome Back! 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to continue</p>
        
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          placeholder="📧 Email address"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-3 outline-none dark:text-white"
        />
        <input
          type="password"
          value={loginPass}
          onChange={(e) => setLoginPass(e.target.value)}
          placeholder="🔒 Password"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-5 outline-none dark:text-white"
        />
        
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-4 rounded-full font-bold hover:bg-blue-700 transition"
        >
          Sign In 🔐
        </button>
        
        <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <button onClick={() => setCurrentScreen('signup')} className="text-blue-500 font-bold">
            Create one ✨
          </button>
        </p>
      </div>
    </div>
  );

  const SignupScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-5 bg-white dark:bg-[#0a0a1a]">
      <div className="w-full max-w-sm">
        <div className="flex justify-between mb-8">
          <div className="w-12 h-12 bg-green-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm9-9a1 1 0 110 2h-1a1 1 0 110-2h1zM5 12a1 1 0 110 2H4a1 1 0 110-2h1z"/></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
            )}
          </button>
        </div>
        <h1 className="text-3xl font-bold mb-2 dark:text-white">Create Account 📝</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Join Roshan Pro Store</p>
        
        <input
          type="text"
          value={signupName}
          onChange={(e) => setSignupName(e.target.value)}
          placeholder="👤 Full Name"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-3 outline-none dark:text-white"
        />
        <input
          type="email"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          placeholder="📧 Email address"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-3 outline-none dark:text-white"
        />
        <input
          type="password"
          value={signupPass}
          onChange={(e) => setSignupPass(e.target.value)}
          placeholder="🔒 Password"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-3 outline-none dark:text-white"
        />
        <input
          type="password"
          value={signupConfirm}
          onChange={(e) => setSignupConfirm(e.target.value)}
          placeholder="🔒 Confirm Password"
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl px-5 py-3 mb-5 outline-none dark:text-white"
        />
        
        <button
          onClick={handleSignup}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-full font-bold hover:opacity-90 transition"
        >
          Sign Up 🚀
        </button>
        
        <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <button onClick={() => setCurrentScreen('login')} className="text-blue-500 font-bold">
            Sign In 🔐
          </button>
        </p>
      </div>
    </div>
  );

  const HomeScreen = () => (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps & games"
            className="bg-transparent outline-none w-full dark:text-white text-sm"
          />
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {darkMode ? (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          )}
        </button>
        <div onClick={() => setCurrentScreen('profile')} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold cursor-pointer border-2 border-blue-500">
          {user?.displayName?.[0] || user?.email?.[0] || 'A'}
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full whitespace-nowrap font-medium transition ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Banner Slider */}
      {banners.length > 0 && (
        <div className="px-4 mb-4">
          <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500">
            <img
              src={banners[0]}
              alt="Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&fit=crop';
              }}
            />
          </div>
        </div>
      )}

      <div className="px-4">
        {/* Recommended Section */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg dark:text-white">⭐ Recommended for you</h3>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(filteredApps).slice(0, 6).map(([id, app]) => {
            const installed = isAppInstalled(app.packageName, app.version);
            const needsUpdate = hasUpdate(app.packageName, app.version);
            return (
              <div
                key={id}
                onClick={() => { setActiveApp(app); setCurrentScreen('detail'); }}
                className="cursor-pointer text-center"
              >
                <div className="relative">
                  <img
                    src={app.icon}
                    alt={app.name}
                    className="w-full aspect-square rounded-2xl object-cover bg-gray-100 dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=App';
                    }}
                  />
                  {installed && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 rounded-full">✓</span>}
                  {needsUpdate && <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-xs px-1.5 rounded-full animate-pulse">🔄</span>}
                </div>
                <p className="text-xs mt-2 dark:text-white truncate">{app.name}</p>
              </div>
            );
          })}
        </div>

        {/* New & Updated Section */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg dark:text-white">🆕 New & updated</h3>
        </div>
        <div className="space-y-2 mb-6">
          {Object.entries(filteredApps).map(([id, app]) => {
            const btnState = getButtonState(app);
            return (
              <div
                key={id}
                onClick={() => { setActiveApp(app); setCurrentScreen('detail'); }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition"
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  className="w-14 h-14 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/56?text=App';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium dark:text-white truncate">{app.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{app.category} • {app.size} MB</p>
                  <div className="flex items-center gap-1 text-xs text-yellow-500">
                    {renderStars(app.rating)} <span className="text-gray-400">({app.rating})</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); btnState.action(); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${btnState.className}`}
                >
                  {btnState.text}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const DetailScreen = () => {
    if (!activeApp) return null;
    const btnState = getButtonState(activeApp);
    const installed = isAppInstalled(activeApp.packageName, activeApp.version);
    const { avg, count } = calculateAvgRating();

    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a1a] pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center">
          <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-5 h-5 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
            )}
          </button>
        </div>

        <div className="p-5">
          {/* App Info */}
          <div className="flex gap-5 mb-5">
            <img
              src={activeApp.icon}
              alt={activeApp.name}
              className="w-20 h-20 rounded-2xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=App';
              }}
            />
            <div>
              <h2 className="text-2xl font-bold dark:text-white">{activeApp.name}</h2>
              <p className="text-blue-500 text-sm">Roshan Pro Publisher 👑</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs dark:text-gray-300">
                  📦 v{activeApp.version}
                </span>
                <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs dark:text-gray-300">
                  💾 {activeApp.size} MB
                </span>
                {activeApp.downloadUrl && (
                  <span className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full text-xs text-green-700 dark:text-green-300">
                    📥 APK Available
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {downloadProgress.visible && (
            <div className="mb-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 relative"
                  style={{ width: `${downloadProgress.percent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{downloadProgress.status}</p>
                <span className="text-sm font-bold text-blue-500">{downloadProgress.percent}%</span>
              </div>
            </div>
          )}

          {/* Rating Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">{avg.toFixed(1)}</div>
                <div className="text-yellow-400 text-lg">{renderStars(avg)}</div>
                <div className="text-xs text-gray-500">{count} ratings</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(star => {
                  const starCount = Object.values(reviews).filter(r => r.rating === star).length;
                  const percent = count > 0 ? (starCount / count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-4">{star}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={btnState.action}
              disabled={downloadProgress.visible}
              className={`flex-1 py-3 rounded-full font-bold text-lg transition active:scale-95 ${btnState.className} ${downloadProgress.visible ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {downloadProgress.visible ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Downloading...
                </span>
              ) : btnState.text}
            </button>
            {installed && (
              <button
                onClick={() => handleUninstall(activeApp)}
                className="px-5 py-3 rounded-full font-bold bg-gradient-to-r from-red-500 to-red-600 text-white transition active:scale-95"
              >
                🗑️ Uninstall
              </button>
            )}
          </div>

          {/* Screenshots */}
          {activeApp.screenshots && activeApp.screenshots.length > 0 && (
            <div className="mb-5">
              <h3 className="font-bold mb-3 dark:text-white">📸 Screenshots</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {activeApp.screenshots.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Screenshot ${i + 1}`}
                    className="h-48 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                  />
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div className="mb-5">
            <h3 className="font-bold mb-2 dark:text-white">ℹ️ About this app</h3>
            <p className="text-gray-600 dark:text-gray-400">{activeApp.desc}</p>
          </div>

          {/* Rate This App */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mb-5">
            <h3 className="font-bold mb-3 dark:text-white">⭐ Rate this app</h3>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className={`text-3xl transition hover:scale-110 ${selectedRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            {selectedRating > 0 && (
              <>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review..."
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 outline-none dark:text-white mb-3"
                  rows={3}
                ></textarea>
                <button
                  onClick={submitReview}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition"
                >
                  Submit Review ✅
                </button>
              </>
            )}
          </div>

          {/* Reviews */}
          <div>
            <h3 className="font-bold mb-3 dark:text-white">💬 Reviews</h3>
            {Object.keys(reviews).length === 0 ? (
              <p className="text-center text-gray-500 py-4">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {Object.values(reviews).reverse().map((review, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {review.userName[0]}
                      </div>
                      <div>
                        <div className="font-medium dark:text-white">{review.userName}</div>
                        <div className="text-yellow-400 text-sm">{renderStars(review.rating)}</div>
                      </div>
                    </div>
                    {review.comment && <p className="text-gray-600 dark:text-gray-400 text-sm">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share & Report */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Check out ${activeApp.name} on Roshan Pro Store!`);
                showToast('Link copied!');
              }}
              className="flex-1 bg-blue-500 text-white py-3 rounded-full font-medium transition active:scale-95"
            >
              📤 Share
            </button>
            <button
              onClick={() => showToast('Report submitted')}
              className="flex-1 bg-red-500 text-white py-3 rounded-full font-medium transition active:scale-95"
            >
              🚨 Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProfileScreen = () => (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold dark:text-white">👤 My Profile</h2>
        <button onClick={() => setDarkMode(!darkMode)} className="ml-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {darkMode ? (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center p-8">
        {/* Profile Picture */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-blue-500">
          {user?.displayName?.[0] || user?.email?.[0] || 'A'}
        </div>
        <h3 className="text-xl font-bold mt-4 dark:text-white">{user?.displayName || 'User'}</h3>
        <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-3 w-full mt-8">
          {[
            { icon: '📥', label: 'Install Guide', color: 'text-blue-500' },
            { icon: '❓', label: 'FAQ', color: 'text-blue-500' },
            { icon: '🗑️', label: 'Clear Cache', color: 'text-blue-500' },
            { icon: '⭐', label: 'Rate Store', color: 'text-yellow-500' },
            { icon: '📧', label: 'Support', color: 'text-blue-500' },
            { icon: '📤', label: 'Share Store', color: 'text-green-500' },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => showToast(`${item.label} clicked`)}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center cursor-pointer border border-gray-200 dark:border-gray-700 active:scale-95 transition"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="text-xs mt-2 dark:text-gray-300">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Store Info */}
        <div className="w-full mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-center text-white">
          <div className="text-3xl mb-2">🏪</div>
          <p className="font-bold">Roshan Pro Store v3.1.0</p>
          <p className="text-xs text-gray-400 mt-1">Developer: MR. Roshan R. Wasnik</p>
          <p className="text-xs text-gray-400">© 2026 BR.Technology Edition</p>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full max-w-xs mt-8 bg-red-500 text-white py-4 rounded-full font-bold transition active:scale-95"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );

  // Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-4 left-4 right-4 bg-white/90 dark:bg-[#111122]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-full flex justify-around py-3 z-50 shadow-lg">
      {[
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'technology', icon: '💻', label: 'Tech' },
        { id: 'news', icon: '📰', label: 'News' },
        { id: 'profile', icon: '👤', label: 'Profile' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setCurrentScreen(item.id)}
          className={`flex flex-col items-center gap-1 transition ${
            currentScreen === item.id ? 'text-blue-500 scale-105' : 'text-gray-400'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </div>
  );

  // Technology Screen
  const TechnologyScreen = () => (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] pb-24">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-xl font-bold dark:text-white">💻 Technology</h2>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-3 dark:text-white flex items-center gap-2">🔬 Latest Tech News</h3>
        {['AI Revolution 2026', 'Quantum Computing Breakthrough', 'New AR Glasses Launch'].map((title, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition">
            <h4 className="font-medium dark:text-white">🔬 {title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest developments in technology sector...</p>
          </div>
        ))}
        
        <h3 className="font-bold mb-3 mt-6 dark:text-white flex items-center gap-2">📱 New Gadgets</h3>
        {['iPhone 17 Pro', 'Samsung Galaxy S26', 'Google Pixel 10'].map((title, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition">
            <h4 className="font-medium dark:text-white">📱 {title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Next generation smartphone with advanced features...</p>
          </div>
        ))}
      </div>
    </div>
  );

  // News Screen
  const NewsScreen = () => (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] pb-24">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-xl font-bold dark:text-white">📰 News</h2>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-3 dark:text-white flex items-center gap-2">🔥 Trending</h3>
        {['Global Tech Summit 2026', 'New App Store Policies', 'Mobile Gaming Records'].map((title, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition">
            <h4 className="font-medium dark:text-white">📰 {title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Breaking news and updates from around the world...</p>
          </div>
        ))}

        <h3 className="font-bold mb-3 mt-6 dark:text-white flex items-center gap-2">🎮 Gaming News</h3>
        {['GTA 6 Release Date', 'PS6 Announcement', 'E-Sports World Cup'].map((title, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700 cursor-pointer active:scale-[0.98] transition">
            <h4 className="font-medium dark:text-white">🎮 {title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest gaming news and releases...</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <FlashScreen visible={showFlash} />
      
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'signup' && <SignupScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'detail' && <DetailScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
      {currentScreen === 'technology' && <TechnologyScreen />}
      {currentScreen === 'news' && <NewsScreen />}
      
      {user && currentScreen !== 'login' && currentScreen !== 'signup' && <BottomNav />}
      
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
