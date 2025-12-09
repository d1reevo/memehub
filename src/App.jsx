import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { 
  Search, Upload, Heart, Download, Menu, X, 
  Home, TrendingUp, Clock, User, LogIn, LogOut, 
  Image as ImageIcon, Tag, Share2, Trash2, 
  MessageSquare, ArrowLeft, Send, CornerDownLeft,
  Edit2, Check
} from 'lucide-react';

// --- НАСТРОЙКИ FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCmX8rpl8X8ddXY5zcd8y0tHcRTjB0MDIo",
  authDomain: "memehub-6ca6d.firebaseapp.com",
  projectId: "memehub-6ca6d",
  storageBucket: "memehub-6ca6d.firebasestorage.app",
  messagingSenderId: "444090744806",
  appId: "1:444090744806:web:20a3a54c6a560d9a3f6027",
  measurementId: "G-67YMGG2PQT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

// --- АДМИН ---
const ADMIN_EMAIL = "d1reevo@gmail.com"; 

// --- КОМПОНЕНТЫ ---

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-purple-600/20 text-purple-400 font-medium shadow-lg shadow-purple-900/10 border border-purple-500/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} className={active ? 'text-purple-400' : 'text-gray-500 group-hover:text-white'} />
      <span>{label}</span>
    </div>
    {count && (
      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
        {count}
      </span>
    )}
  </button>
);

const TagPill = ({ text }) => (
  <span className="px-3 py-1 text-[11px] font-medium bg-[#1e1e1e] text-gray-400 rounded-full border border-white/5 hover:border-purple-500/50 hover:text-purple-300 transition-colors cursor-pointer">
    #{text}
  </span>
);

const MemeCard = ({ meme, currentUserId, isAdmin, onLike, onDownload, onDelete, onClick }) => {
  const isLiked = meme.likesBy?.includes(currentUserId);
  const isUploader = currentUserId === meme.uploaderId;
  const canDelete = isAdmin || isUploader;

  return (
    <div 
      className="bg-[#121212] rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/10 flex flex-col h-full group cursor-pointer overflow-hidden"
      onClick={() => onClick(meme)}
    >
      <div className="relative aspect-square bg-[#0a0a0a] overflow-hidden">
        <img 
          src={meme.url} 
          alt={meme.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <h3 className="text-white font-bold text-lg line-clamp-1 drop-shadow-md">{meme.title}</h3>
             <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                    {meme.uploaderName ? meme.uploaderName[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs text-gray-300 font-medium truncate">
                    {meme.uploaderName || 'Аноним'}
                </span>
            </div>
        </div>
        {canDelete && (
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(meme.id, meme.title); }}
             className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 rounded-full text-white transition-all shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
             title="Удалить мем"
           >
             <Trash2 size={16} />
           </button>
        )}
      </div>
      <div className="p-3 flex items-center justify-between bg-[#181818]">
        <button 
            onClick={(e) => { e.stopPropagation(); onLike(meme.id, isLiked); }}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors px-2 py-1 rounded-lg ${isLiked ? 'text-pink-500 bg-pink-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            {meme.likes || 0}
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onDownload(meme); }}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-purple-400 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/10"
        >
             <Download size={16} />
             {meme.downloads || 0}
        </button>
      </div>
    </div>
  );
};

const MemeDetailView = ({ meme, currentUser, isAdmin, onBack, onLike, onDownload, onDelete }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const isLiked = meme.likesBy?.includes(currentUser?.uid);
    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'memes', meme.id, 'comments');

    useEffect(() => {
        const q = query(commentsRef, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [meme.id]);

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        if (!currentUser || currentUser.isAnonymous) {
            alert("Войдите, чтобы комментировать!");
            return;
        }
        setIsSending(true);
        try {
            await addDoc(commentsRef, {
                text: newComment.trim(),
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: serverTimestamp()
            });
            setNewComment('');
        } catch (error) {
            console.error(error);
            alert("Ошибка отправки комментария");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if(!confirm("Удалить комментарий?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memes', meme.id, 'comments', commentId));
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#090909]">
            <div className="flex-1 flex flex-col overflow-hidden relative bg-black">
                <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none">
                    <img src={meme.url} alt="blur-bg" className="w-full h-full object-cover blur-3xl scale-110"/>
                    <div className="absolute inset-0 bg-black/60" />
                </div>
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={onBack} className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2 px-4 border border-white/10 hover:border-white/30">
                        <ArrowLeft size={20} /> Назад
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 lg:p-10 overflow-auto relative z-10">
                    <img src={meme.url} alt={meme.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black/80"/>
                </div>
                <div className="lg:hidden p-4 bg-[#121212] border-t border-white/5 flex items-center justify-between relative z-20">
                     <div className="flex items-center gap-4">
                        <button onClick={() => onLike(meme.id, isLiked)} className={`flex items-center gap-2 font-bold ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}>
                            <Heart fill={isLiked ? "currentColor" : "none"} /> {meme.likes || 0}
                        </button>
                        <button onClick={() => onDownload(meme)} className="flex items-center gap-2 text-gray-400 font-bold">
                            <Download /> Скачать
                        </button>
                     </div>
                </div>
            </div>
            <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-[#0f0f0f] border-l border-white/5 h-[50vh] lg:h-full relative z-20 shadow-2xl">
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-2xl font-bold text-white mb-2 leading-tight">{meme.title}</h1>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white">
                                {meme.uploaderName ? meme.uploaderName[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">{meme.uploaderName || 'Аноним'}</div>
                                <div className="text-xs text-gray-500">
                                    {meme.timestamp?.seconds ? new Date(meme.timestamp.seconds * 1000).toLocaleDateString() : 'Недавно'}
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-2">
                             <button onClick={() => onLike(meme.id, isLiked)} className={`p-2 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}>
                                <Heart fill={isLiked ? "currentColor" : "none"} size={20} />
                            </button>
                             <button onClick={() => onDownload(meme)} className="p-2 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-400 hover:text-purple-400 transition-colors">
                                <Download size={20} />
                            </button>
                            {(isAdmin || currentUser?.uid === meme.uploaderId) && (
                                <button onClick={() => { onDelete(meme.id, meme.title); onBack(); }} className="p-2 rounded-full bg-[#1e1e1e] hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {meme.tags && meme.tags.map((tag, idx) => <TagPill key={idx} text={tag} />)}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
                    {comments.length === 0 ? (
                        <div className="text-center text-gray-600 py-10 flex flex-col items-center">
                            <MessageSquare size={48} className="opacity-20 mb-2"/>
                            <p>Комментариев пока нет. Будьте первым!</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3 group">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400 border border-white/5">
                                    {comment.userName[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-gray-300">{comment.userName}</span>
                                        <span className="text-[10px] text-gray-600">
                                            {comment.timestamp?.seconds ? new Date(comment.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-0.5 break-words">{comment.text}</p>
                                </div>
                                {(isAdmin || currentUser?.uid === comment.userId) && (
                                    <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-white/5 bg-[#121212]">
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Написать комментарий..." className="flex-1 bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                        <button type="submit" disabled={!newComment.trim() || isSending} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors">
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const AuthModal = ({ isOpen, onClose, authMode, setAuthMode, onAction, loading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#151515] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                <div className="text-center mb-6">
                    <h3 className="font-bold text-white text-xl mb-1">{authMode === 'login' ? 'С возвращением!' : 'Создать аккаунт'}</h3>
                    <p className="text-gray-500 text-sm">Войдите, чтобы загружать и сохранять мемы</p>
                </div>
                <div className="space-y-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors" />
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                    <button onClick={() => onAction(email, password, authMode)} disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all active:scale-95">
                        {loading ? 'Загрузка...' : (authMode === 'login' ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                    <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setEmail(''); setPassword(''); }} className="w-full text-sm text-gray-400 mt-2 hover:text-white transition-colors">
                        {authMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [memes, setMemes] = useState([]);
  const [view, setView] = useState('home'); 
  const [activeMeme, setActiveMeme] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Upload States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadType, setUploadType] = useState('file'); 
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Состояние для перетаскивания
  const fileInputRef = useRef(null);

  const isAdmin = user && user.email === ADMIN_EMAIL;
  const isLoggedIn = user && !user.isAnonymous; 

  useEffect(() => { 
      return onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          if (currentUser) {
              setNewName(currentUser.displayName || currentUser.email.split('@')[0]);
          }
      }); 
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'memes'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMemes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateName = async () => {
      if (!newName.trim() || !user) return;
      try {
          await updateProfile(user, { displayName: newName });
          setUser({ ...user, displayName: newName });
          setIsEditingName(false);
      } catch (error) {
          console.error("Failed to update name", error);
          alert("Не удалось обновить имя.");
      }
  };

  const handleAuthAction = async (email, password, mode) => {
      setAuthLoading(true); setAuthError(null);
      const cleanEmail = email.trim(); 
      try {
          if (mode === 'register') await createUserWithEmailAndPassword(auth, cleanEmail, password);
          else await signInWithEmailAndPassword(auth, cleanEmail, password);
          setIsAuthModalOpen(false);
      } catch (error) {
          if (error.code === 'auth/email-already-in-use') setAuthError('Email уже занят');
          else if (error.code === 'auth/invalid-credential') setAuthError('Неверный Email или пароль');
          else if (error.code === 'auth/invalid-email') setAuthError('Некорректный формат Email');
          else setAuthError("Ошибка: " + error.code);
      } finally {
          setAuthLoading(false);
      }
  };

  const handleDelete = async (memeId, memeTitle) => {
      if (!confirm(`Удалить мем "${memeTitle}"?`)) return;
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memes', memeId));
          if (activeMeme?.id === memeId) {
             setView('home');
             setActiveMeme(null);
          }
          alert("Удалено!");
      } catch (error) {
          console.error(error);
          alert("Ошибка удаления. Нет прав.");
      }
  };

  const handleLike = async (memeId, isLiked) => {
    if (!isLoggedIn) return setIsAuthModalOpen(true);
    const memeRef = doc(db, 'artifacts', appId, 'public', 'data', 'memes', memeId);
    const currentMeme = memes.find(m => m.id === memeId);
    let newLikesBy = currentMeme.likesBy || [];
    
    if (isLiked) {
       newLikesBy = newLikesBy.filter(id => id !== user.uid);
       await updateDoc(memeRef, { likes: increment(-1), likesBy: newLikesBy });
    } else {
       if (!newLikesBy.includes(user.uid)) {
         newLikesBy = [...newLikesBy, user.uid];
         await updateDoc(memeRef, { likes: increment(1), likesBy: newLikesBy });
       }
    }
  };

  const handleDownload = async (meme) => {
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'memes', meme.id), { downloads: increment(1) });
    try {
        if (meme.url.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = meme.url;
            a.download = `memehub_${meme.title.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }
        const response = await fetch(meme.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `memehub_${meme.title.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        console.error("Download failed:", e);
        if(confirm("Не удалось скачать файл автоматически. Открыть картинку в новой вкладке?")) {
            window.open(meme.url, '_blank');
        }
    }
  };

  // --- ЛОГИКА DRAG & DROP ---
  const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = () => {
      setIsDragging(false);
  };

  const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
          const file = droppedFiles[0];
          if (file.type.startsWith('image/')) {
              setUploadFile(file);
          } else {
              alert("Пожалуйста, загрузите изображение (PNG, JPG, GIF)");
          }
      }
  };

  // --- ОБНОВЛЕННАЯ ЗАГРУЗКА ---
  const handleUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalUrl = uploadUrl;
      if (uploadType === 'file' && uploadFile) {
        if (uploadFile.size > 100 * 1024 * 1024) {
            alert("Файл слишком большой (>100MB). Пожалуйста, выберите файл поменьше.");
            setIsUploading(false);
            return;
        }
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(uploadFile);
          reader.onload = (event) => {
             const img = new Image();
             img.src = event.target.result;
             img.onload = () => {
                 const canvas = document.createElement('canvas');
                 const ctx = canvas.getContext('2d');
                 let MAX_SIZE = 1200; 
                 let quality = 0.8;
                 let width = img.width;
                 let height = img.height;
                 const resize = () => {
                     if (width > height) {
                         if (width > MAX_SIZE) {
                             height *= MAX_SIZE / width;
                             width = MAX_SIZE;
                         }
                     } else {
                         if (height > MAX_SIZE) {
                             width *= MAX_SIZE / height;
                             height = MAX_SIZE;
                         }
                     }
                     canvas.width = width;
                     canvas.height = height;
                     ctx.drawImage(img, 0, 0, width, height);
                     return canvas.toDataURL('image/jpeg', quality);
                 };
                 let dataUrl = resize();
                 while (dataUrl.length > 1000000 && (quality > 0.5 || MAX_SIZE > 600)) {
                     MAX_SIZE -= 200;
                     quality -= 0.1;
                     dataUrl = resize();
                 }
                 resolve(dataUrl);
             };
          };
        });
      }
      
      const tagsArray = uploadTags.split(',').map(t => t.trim()).filter(t => t);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'memes'), {
        title: uploadTitle.trim(),
        url: finalUrl,
        tags: tagsArray,
        uploaderId: user.uid,
        uploaderName: user.displayName || user.email.split('@')[0],
        likes: 0,
        downloads: 0,
        likesBy: [],
        timestamp: serverTimestamp()
      });
      setIsUploadModalOpen(false);
      setUploadTitle(''); setUploadTags(''); setUploadFile(null); setUploadUrl('');
    } catch (error) {
      console.error(error);
      alert("Ошибка загрузки: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const openMemeDetail = (meme) => {
      setActiveMeme(meme);
      setView('meme-detail');
  }

  const filteredMemes = memes.filter(meme => 
    meme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (meme.tags && meme.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const displayMemes = view === 'my-memes' && isLoggedIn
    ? filteredMemes.filter(m => m.uploaderId === user.uid)
    : view === 'favorites' && isLoggedIn
    ? filteredMemes.filter(m => m.likesBy?.includes(user.uid))
    : filteredMemes;

  if (view === 'meme-detail' && activeMeme) {
      const liveMeme = memes.find(m => m.id === activeMeme.id) || activeMeme;
      return (
        <MemeDetailView 
            meme={liveMeme} 
            currentUser={user} 
            isAdmin={isAdmin}
            onBack={() => { setView('home'); setActiveMeme(null); }}
            onLike={handleLike}
            onDownload={handleDownload}
            onDelete={handleDelete}
        />
      );
  }

  return (
    <div className="flex h-screen bg-[#090909] text-gray-200 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay (Added Fix) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 left-0 h-full w-64 bg-[#0f0f0f] border-r border-white/5 z-50 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/20">M</div>
          <h1 className="text-xl font-bold text-white tracking-tight">MemeHub</h1>
        </div>
        <div className="px-4 py-2 mb-4">
            {isLoggedIn ? (
                <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-xs text-gray-500 font-medium mb-1">Вы вошли как</div>
                        <div className="flex items-center justify-between">
                            {isEditingName ? (
                                <div className="flex items-center gap-1 w-full mr-1">
                                    <input autoFocus className="bg-[#0a0a0a] border border-purple-500/50 rounded px-1.5 py-0.5 text-sm text-white w-full outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()} />
                                    <button onClick={handleUpdateName} className="text-green-500 hover:text-green-400 p-1"><Check size={14}/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group/name w-full">
                                    <div className="text-white font-bold truncate text-sm">
                                        {user.displayName || user.email.split('@')[0]}
                                    </div>
                                    <button onClick={() => setIsEditingName(true)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover/name:opacity-100 transition-opacity">
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {isAdmin && <div className="inline-block mt-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20">ADMIN</div>}
                        <button onClick={() => signOut(auth)} className="mt-3 text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"><LogOut size={12}/> Выйти из аккаунта</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="w-full py-3 bg-[#1e1e1e] hover:bg-[#252525] border border-white/10 hover:border-purple-500/30 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group">
                    <LogIn size={16} className="text-purple-500 group-hover:scale-110 transition-transform"/> Войти
                </button>
            )}
        </div>
        <nav className="px-2 space-y-1">
          <SidebarItem icon={Home} label="Лента" active={view === 'home'} onClick={() => setView('home')} />
          <SidebarItem icon={TrendingUp} label="Популярное" active={view === 'trending'} onClick={() => setView('trending')} />
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Библиотека</div>
          <SidebarItem icon={User} label="Мои загрузки" active={view === 'my-memes'} onClick={() => isLoggedIn ? setView('my-memes') : setIsAuthModalOpen(true)} count={isLoggedIn ? memes.filter(m => m.uploaderId === user.uid).length : null} />
          <SidebarItem icon={Heart} label="Понравилось" active={view === 'favorites'} onClick={() => isLoggedIn ? setView('favorites') : setIsAuthModalOpen(true)} count={isLoggedIn ? memes.filter(m => m.likesBy?.includes(user.uid)).length : null} />
        </nav>
      </aside>
      <main className="flex-1 flex flex-col h-full bg-[#090909]">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 bg-[#090909]/80 backdrop-blur-md sticky top-0 z-30">
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}><Menu/></button>
          <div className="flex-1 max-w-xl mx-4 relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={18}/>
             <input type="text" placeholder="Поиск мемов, тегов..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#151515] border border-transparent focus:border-purple-500/30 rounded-full py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:bg-[#1a1a1a] transition-all placeholder:text-gray-600" />
          </div>
          <button onClick={() => isLoggedIn ? setIsUploadModalOpen(true) : setIsAuthModalOpen(true)} className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all active:scale-95">
            <Upload size={18}/> <span>Загрузить</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {displayMemes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600">
                    <ImageIcon size={64} className="mb-4 opacity-20"/>
                    <p className="text-lg font-medium">Здесь пока пусто...</p>
                    <p className="text-sm">Загрузите первый мем!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                    {displayMemes.map(meme => (
                    <MemeCard key={meme.id} meme={meme} currentUserId={user?.uid} isAdmin={isAdmin} onLike={handleLike} onDownload={handleDownload} onDelete={handleDelete} onClick={openMemeDetail} />
                    ))}
                </div>
            )}
        </div>
      </main>
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#151515] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
                 <h3 className="text-white font-bold text-lg flex items-center gap-2"><Upload className="text-purple-500"/> Новый мем</h3>
                 <button onClick={()=>setIsUploadModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                  <div className="flex p-1 bg-[#0a0a0a] rounded-xl border border-white/5">
                     <button onClick={()=>setUploadType('file')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadType==='file'?'bg-[#252525] text-white shadow-sm':'text-gray-500 hover:text-gray-300'}`}>Файл</button>
                     <button onClick={()=>setUploadType('url')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadType==='url'?'bg-[#252525] text-white shadow-sm':'text-gray-500 hover:text-gray-300'}`}>Ссылка</button>
                  </div>
                  {uploadType === 'file' ? (
                      <div 
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative group ${uploadFile ? 'border-purple-500/50 bg-purple-500/5' : isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e=>setUploadFile(e.target.files[0])} />
                          {uploadFile ? (
                              <div className="relative z-10">
                                  <ImageIcon size={40} className="text-purple-400 mx-auto mb-2"/>
                                  <p className="text-white font-medium text-sm truncate max-w-[200px]">{uploadFile.name}</p>
                                  <p className="text-purple-400 text-xs mt-1">Нажмите, чтобы изменить</p>
                              </div>
                          ) : (
                              <div className="relative z-10 pointer-events-none">
                                  <div className="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                      <Upload size={24} className="text-gray-400 group-hover:text-white"/>
                                  </div>
                                  <p className="text-white font-medium">{isDragging ? 'Отпустите файл здесь' : 'Нажмите или перетащите фото'}</p>
                                  <p className="text-gray-500 text-xs mt-1">PNG, JPG, GIF до 100MB</p>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">URL картинки</label>
                          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 focus-within:border-purple-500 transition-colors">
                              <Share2 size={16} className="text-gray-500"/>
                              <input type="text" placeholder="https://..." value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-700"/>
                          </div>
                      </div>
                  )}
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Название</label>
                          <input type="text" placeholder="Придумайте смешной заголовок..." value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors placeholder:text-gray-700"/>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Теги</label>
                          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 focus-within:border-purple-500 transition-colors">
                              <Tag size={16} className="text-gray-500"/>
                              <input type="text" placeholder="кот, мем, жиза..." value={uploadTags} onChange={e=>setUploadTags(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-700"/>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="p-5 border-t border-white/5 bg-[#1a1a1a] flex gap-3">
                  <button onClick={()=>setIsUploadModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Отмена</button>
                  <button onClick={handleUpload} disabled={isUploading} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {isUploading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <>Опубликовать <CornerDownLeft size={16}/></>}
                  </button>
              </div>
           </div>
        </div>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={()=>setIsAuthModalOpen(false)} authMode={authMode} setAuthMode={setAuthMode} onAction={handleAuthAction} loading={authLoading} error={authError} />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
}