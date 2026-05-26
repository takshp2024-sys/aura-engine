import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, updateDoc } from 'firebase/firestore';
import { Shirt, Trash2, Zap, User, PlusCircle, LogOut, Loader, Sun, Briefcase, HeartHandshake, ZapIcon, Grid3x3, CheckCircle2 } from 'lucide-react';

// --- FireBase and Global Configuration Setup ---

/**
 * STEP 1: FIREBASE CONFIGURATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyBSZKIzEcYKWOw3R91tUCzFCaelHWoA7v4",
  authDomain: "aura-style-engine.firebaseapp.com",
  projectId: "aura-style-engine",
  storageBucket: "aura-style-engine.firebasestorage.app",
  messagingSenderId: "660996607391",
  appId: "1:660996607391:web:32eae2fe7cd2ad9b8cc1aa",
  measurementId: "G-S5YREVMESM"
};

/**
 * STEP 2: GOOGLE AI API KEY
 */
const API_KEY = "AIzaSyCgm76UwJ3bT_oAemk6mROVjj46-EPreWw"; 

// Internal app logic constants
const appId = typeof __app_id !== 'undefined' ? __app_id : 'style-engine-default-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

// Constants
const MAX_PER_CATEGORY = 100;
const CATEGORIES = [
  { id: 'jackets', icon: '🧥', label: 'Jackets' },
  { id: 'tops', icon: '👕', label: 'Tops' },
  { id: 'bottoms', icon: '👖', label: 'Bottoms' },
  { id: 'shoes', icon: '👟', label: 'Shoes' },
  { id: 'accessories', icon: '💍', label: 'Accessories' },
];

// --- Utility Functions ---

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

async function fetchWithBackoff(url, options, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// --- AI Recommendation Core Logic ---

const generateOutfitSuggestion = async (userId, gender, wardrobeItems, event, weather) => {
  const model = "gemini-2.5-flash-preview-09-2025";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  const wardrobeSummary = wardrobeItems.map(item => 
    `(${item.category}): ${item.name || 'Unnamed item'} - color: ${item.color || 'n/a'}`
  ).join('\n');

  const userQuery = `
    You are 'Aura', a luxury fashion stylist.
    User Profile: ${gender}. Occasion: "${event}". Weather: "${weather}".
    Available items:
    ${wardrobeSummary}
    
    Recommend a specific outfit from these items. Explain why it fits the weather and event.
    Respond in one single, high-energy paragraph without markdown formatting.
  `;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: {
        parts: [{ text: "You are Aura, an elite fashion stylist. Provide one high-energy, personalized paragraph of styling advice." }]
    }
  };

  try {
    const response = await fetchWithBackoff(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return { text: result.candidates?.[0]?.content?.parts?.[0]?.text || "Aura is resting. Try again soon!" };
  } catch (error) {
    return { text: "Connection to the fashion engine failed." };
  }
};

// --- React Components ---

const AuthPage = ({ onAuthSuccess }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    try {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
      else await signInAnonymously(auth);
      onAuthSuccess(auth);
    } catch (error) {
      setIsSigningIn(false);
      alert('Auth failed.');
    }
  }, [onAuthSuccess]);

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
      <div className="bg-indigo-600 p-4 rounded-3xl mb-6 shadow-xl">
        <ZapIcon className="w-12 h-12 text-white animate-pulse" />
      </div>
      <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">AURA ENGINE</h1>
      <p className="text-gray-500 mb-10 max-w-xs text-lg">Your Wardrobe.</p>
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center text-lg"
      >
        {isSigningIn ? <Loader className="w-6 h-6 animate-spin" /> : "Start Styling"}
      </button>
    </div>
  );
};

const OnboardingPage = ({ userId, db, userProfile, setUserProfile }) => {
  const [isLoading, setIsLoading] = useState(false);

  const saveGender = async (gender) => {
    if (!db || !userId) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
      await setDoc(userDocRef, { gender, onboarded: true }, { merge: true });
      setUserProfile(prev => ({ ...prev, gender, onboarded: true }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 mb-2">Identify Your Model</h2>
        <p className="text-gray-500">We'll use this to generate your 3D-360 preview.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-10">
        {['Male', 'Female'].map(g => (
          <button
            key={g}
            onClick={() => saveGender(g)}
            disabled={isLoading}
            className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-95
              ${userProfile.gender === g ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 hover:border-indigo-200 text-gray-800'}`}
          >
            <div className="flex items-center">
                <span className="text-4xl mr-4">{g === 'Male' ? '👔' : '👗'}</span>
                <span className="text-xl font-bold">{g} Model</span>
            </div>
            {userProfile.gender === g && <CheckCircle2 className="w-6 h-6" />}
          </button>
        ))}
      </div>

      <div className="aspect-square bg-gray-50 rounded-[40px] border border-gray-100 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <User className="w-16 h-16 text-indigo-600" />
        </div>
        <h3 className="font-bold text-gray-900">3D Simulation Ready</h3>
        <p className="text-sm text-gray-500 mt-2">360° rendering engine will adapt to your selections.</p>
      </div>

      {userProfile.onboarded && (
        <button
          onClick={() => setUserProfile(prev => ({ ...prev, step: 'wardrobe' }))}
          className="w-full mt-10 bg-black text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors"
        >
          Enter Wardrobe
        </button>
      )}
    </div>
  );
};

const WardrobePage = ({ userId, db, wardrobeItems, setWardrobeItems }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [isUploading, setIsUploading] = useState(false);

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(cat => {
      counts[cat.id] = wardrobeItems.filter(item => item.category === cat.id).length;
    });
    return counts;
  }, [wardrobeItems]);

  const currentCategoryCount = categoryCounts[selectedCategory] || 0;
  const canAddMore = currentCategoryCount < MAX_PER_CATEGORY;

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!db || !userId || !canAddMore || !itemName || !selectedFile) return;

    setIsUploading(true);
    try {
        const newItem = {
            id: crypto.randomUUID(),
            name: itemName,
            category: selectedCategory,
            color: itemColor,
            imageUrl: `https://placehold.co/200x200/4f46e5/ffffff?text=${itemName.substring(0,2).toUpperCase()}`, 
            dateAdded: new Date().toISOString(),
        };

        const wardrobeDocRef = doc(db, 'artifacts', appId, 'users', userId, 'wardrobe', 'data');
        const newWardrobe = [...wardrobeItems, newItem];
        await setDoc(wardrobeDocRef, { items: newWardrobe }, { merge: true });
        
        setSelectedFile(null);
        setItemName('');
        setItemColor('');
        setWardrobeItems(newWardrobe);
    } catch (error) {
        console.error(error);
        alert('Upload failed.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!db || !userId || !window.confirm("Delete item?")) return;
    try {
        const updatedWardrobe = wardrobeItems.filter(item => item.id !== itemId);
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'wardrobe', 'data'), { items: updatedWardrobe }, { merge: true });
        setWardrobeItems(updatedWardrobe);
    } catch (error) { console.error(error); }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900">Wardrobe</h2>
        <p className="text-gray-500">100 items limit per category.</p>
      </div>

      {/* Category Progress */}
      <div className="grid grid-cols-5 gap-2 mb-8">
        {CATEGORIES.map(cat => (
            <div key={cat.id} className="text-center">
                <div className="h-12 w-full bg-gray-100 rounded-xl mb-1 relative overflow-hidden flex items-center justify-center text-xl">
                    {cat.icon}
                    <div 
                        className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${(categoryCounts[cat.id] / MAX_PER_CATEGORY) * 100}%` }}
                    />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{categoryCounts[cat.id]}/100</p>
            </div>
        ))}
      </div>

      <form onSubmit={handleAddItem} className="bg-gray-50 p-6 rounded-[32px] mb-10 border border-gray-200">
        <div className="space-y-4">
          <div className="flex justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-white hover:border-indigo-400 transition-colors">
            <label className="cursor-pointer text-center">
                <PlusCircle className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
                <span className="text-sm font-bold text-gray-700">{selectedFile ? selectedFile.name : "Tap to Upload Photo"}</span>
                <input type="file" className="sr-only" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} />
            </label>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="p-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 ring-indigo-500" required />
              <input type="text" placeholder="Color" value={itemColor} onChange={(e) => setItemColor(e.target.value)} className="p-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 ring-indigo-500" required />
          </div>
          
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 ring-indigo-500 font-bold">
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label} ({categoryCounts[cat.id]}/100)</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isUploading || !canAddMore || !selectedFile} className="w-full mt-6 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 disabled:opacity-50">
          {isUploading ? <Loader className="animate-spin mx-auto" /> : `Add to ${selectedCategory}`}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {wardrobeItems.map(item => (
          <div key={item.id} className="relative group bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
            <img src={item.imageUrl} className="w-full aspect-square object-cover rounded-2xl mb-2" alt="" />
            <button onClick={() => handleRemoveItem(item.id)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-red-500 shadow-md"><Trash2 className="w-4 h-4" /></button>
            <div className="px-2 pb-2">
                <p className="font-bold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 uppercase font-black">{item.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecommendationsPage = ({ userId, userProfile, wardrobeItems }) => {
  const [event, setEvent] = useState('');
  const [weather, setWeather] = useState('');
  const [rec, setRec] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (wardrobeItems.length === 0) return alert("Add items first!");
    setIsLoading(true);
    const result = await generateOutfitSuggestion(userId, userProfile.gender, wardrobeItems, event, weather);
    setRec(result.text);
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-black text-gray-900 mb-6">Stylist AI</h2>
      
      <div className="space-y-4 mb-10">
        <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Occasion</label>
            <input type="text" placeholder="Fashion Gala, Gym, Date..." value={event} onChange={(e) => setEvent(e.target.value)} className="w-full bg-transparent text-xl font-bold placeholder:text-gray-300 focus:outline-none" />
        </div>
        <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Environment</label>
            <input type="text" placeholder="Chilly, Humid, 25°C..." value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full bg-transparent text-xl font-bold placeholder:text-gray-300 focus:outline-none" />
        </div>
        <button onClick={handleGenerate} disabled={isLoading || !event} className="w-full bg-black text-white font-black py-6 rounded-[32px] shadow-2xl flex items-center justify-center text-lg active:scale-95 transition-transform disabled:opacity-50">
          {isLoading ? <Loader className="animate-spin w-8 h-8" /> : "GENERATE LOOK"}
        </button>
      </div>

      {rec && (
        <div className="bg-indigo-600 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
          <Zap className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
          <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-70">Aura Stylist Advice</h3>
          <p className="text-lg font-medium leading-relaxed italic">"{rec}"</p>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState({ gender: null, onboarded: false });
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [currentPage, setCurrentPage] = useState('onboarding');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Basic safety check for empty config
    if (!firebaseConfig.apiKey) {
        console.warn("Firebase config is missing. Please paste it into the firebaseConfig object at the top of the file.");
        setIsAuthReady(true);
        return;
    }

    const app = initializeApp(firebaseConfig);
    const newAuth = getAuth(app);
    const newDb = getFirestore(app);
    setAuth(newAuth);
    setDb(newDb);

    const unsubscribe = onAuthStateChanged(newAuth, (user) => {
        if (user) { setUserId(user.uid); setIsAuthReady(true); } 
        else { setUserId(null); setIsAuthReady(true); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !userId) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
    const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProfile({ gender: d.gender, onboarded: d.onboarded });
        if (d.onboarded && currentPage === 'onboarding') setCurrentPage('wardrobe');
      }
    });

    const wardrobeRef = doc(db, 'artifacts', appId, 'users', userId, 'wardrobe', 'data');
    const unsubscribeWardrobe = onSnapshot(wardrobeRef, (snap) => {
        if (snap.exists()) setWardrobeItems(snap.data().items || []);
    });

    return () => { unsubscribeProfile(); unsubscribeWardrobe(); };
  }, [db, userId]);

  if (!isAuthReady) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!userId) return <AuthPage onAuthSuccess={setAuth} />;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        {currentPage === 'onboarding' && <OnboardingPage userId={userId} db={db} userProfile={userProfile} setUserProfile={setUserProfile} />}
        {currentPage === 'wardrobe' && <WardrobePage userId={userId} db={db} wardrobeItems={wardrobeItems} setWardrobeItems={setWardrobeItems} />}
        {currentPage === 'recommendations' && <RecommendationsPage userId={userId} userProfile={userProfile} wardrobeItems={wardrobeItems} />}
      </div>

      {userProfile.onboarded && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-black/90 backdrop-blur-xl rounded-[32px] p-2 flex justify-between items-center shadow-2xl z-50">
          <button onClick={() => setCurrentPage('wardrobe')} className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-colors ${currentPage === 'wardrobe' ? 'bg-white text-black' : 'text-gray-500'}`}>
            <Shirt className="w-6 h-6" />
            <span className="text-[10px] font-black mt-1">CLOSET</span>
          </button>
          <button onClick={() => setCurrentPage('recommendations')} className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-colors ${currentPage === 'recommendations' ? 'bg-white text-black' : 'text-gray-500'}`}>
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-black mt-1">AURA AI</span>
          </button>
          <button onClick={() => signOut(auth)} className="flex-1 flex flex-col items-center py-3 text-gray-500 hover:text-red-400">
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-black mt-1">EXIT</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;