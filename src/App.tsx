import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Tag,
  Layers, 
  Search, 
  Upload, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles,
  Zap,
  Library,
  Plus,
  Trash2,
  Filter,
  Palette,
  FolderPlus,
  Folder,
  History,
  Grid,
  X,
  FileText,
  Save,
  Star,
  Heart,
  Code,
  Brush,
  Camera,
  Coffee,
  Globe,
  Settings,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Flame,
  HeartOff,
  StarHalf,
  Sun,
  Moon,
  Rocket,
  Plane,
  Music,
  Video,
  Box,
  Layout,
  Book,
  Pen,
  Clock,
  Briefcase,
  Monitor,
  Gamepad2,
  Smartphone,
  Map,
  Compass,
  Trophy,
  Gift,
  Smile
} from 'lucide-react';
import { geminiService } from './services/gemini';

type Tool = 'home' | 'vision' | 'structure' | 'library';
type Theme = 'light' | 'dark';
type LibraryView = 'all' | 'favorites' | 'unclassified' | 'untagged' | 'recent' | 'folder';

interface FolderModel {
  id: string;
  name: string;
  parentId: string | null;
  iconName: string;
  color: string;
}

interface SavedKeyword {
  id: string;
  title: string;
  text: string;
  tags: string[];
  thumbnail: string | null;
  folderId: string | null;
  isFavorite: boolean;
  rating: number;
  createdAt: number;
  lastUsedAt?: number;
}

const LIB_ICONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Flame', icon: Flame },
  { name: 'Code', icon: Code },
  { name: 'Brush', icon: Brush },
  { name: 'Camera', icon: Camera },
  { name: 'Coffee', icon: Coffee },
  { name: 'Globe', icon: Globe },
  { name: 'Settings', icon: Settings },
  { name: 'Zap', icon: Zap },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Rocket', icon: Rocket },
  { name: 'Plane', icon: Plane },
  { name: 'Music', icon: Music },
  { name: 'Video', icon: Video },
  { name: 'Box', icon: Box },
  { name: 'Layout', icon: Layout },
  { name: 'Book', icon: Book },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Monitor', icon: Monitor },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Map', icon: Map },
  { name: 'Compass', icon: Compass },
  { name: 'Trophy', icon: Trophy },
  { name: 'Gift', icon: Gift },
  { name: 'Smile', icon: Smile }
];

const LIB_COLORS = [
  '#FF4D00', '#FFD60A', '#32D74B', '#0A84FF', '#BF5AF2', '#FF375F', '#ACADAF'
];

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('home');
  const [activeTheme, setActiveTheme] = useState<Theme>('dark');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Results state
  const [visionResult, setVisionResult] = useState<string>('');
  const [structureResult, setStructureResult] = useState<string>('');

  // Inputs state
  const [structureInput, setStructureInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library state
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [folders, setFolders] = useState<FolderModel[]>([]);
  const [activeLibraryView, setActiveLibraryView] = useState<LibraryView>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Edit state
  const [editingKeyword, setEditingKeyword] = useState<SavedKeyword | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderModel | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showExecutePopup, setShowExecutePopup] = useState(false);
  const [isPopupCollapsed, setIsPopupCollapsed] = useState(false);
  const [coverImages, setCoverImages] = useState<string[]>(['https://picsum.photos/seed/fusion/1920/1080']);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  
  // Carousel logic
  useEffect(() => {
    if (coverImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentCoverIndex((prev) => (prev + 1) % coverImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [coverImages.length]);
  
  // Inputs for library
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const editThumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const v4_keywords = localStorage.getItem('prompt_canvas_keywords_v4');
      const v4_folders = localStorage.getItem('prompt_canvas_folders_v4');
      
      const normalizeKeyword = (k: any): SavedKeyword => ({
        id: k.id || generateId(),
        title: k.title || '未命名节点',
        text: k.text || '',
        tags: Array.isArray(k.tags) ? k.tags : [],
        thumbnail: k.thumbnail || null,
        folderId: k.folderId || null,
        isFavorite: !!k.isFavorite,
        rating: typeof k.rating === 'number' ? k.rating : 0,
        createdAt: k.createdAt || Date.now(),
        lastUsedAt: k.lastUsedAt || k.createdAt || Date.now()
      });

      const normalizeFolder = (f: any): FolderModel => ({
        id: f.id || generateId(),
        name: f.name || '未命名文件夹',
        parentId: f.parentId || null,
        iconName: f.iconName || 'Folder',
        color: f.color || LIB_COLORS[0]
      });

      if (v4_keywords) {
        const parsed = JSON.parse(v4_keywords);
        setKeywords(Array.isArray(parsed) ? parsed.map(normalizeKeyword) : []);
      } else {
        const v3_keywords = localStorage.getItem('prompt_canvas_keywords_v3');
        if (v3_keywords) {
          const parsed = JSON.parse(v3_keywords);
          const normalized = Array.isArray(parsed) ? parsed.map(normalizeKeyword) : [];
          setKeywords(normalized);
          localStorage.setItem('prompt_canvas_keywords_v4', JSON.stringify(normalized));
        }
      }

      if (v4_folders) {
        const parsed = JSON.parse(v4_folders);
        setFolders(Array.isArray(parsed) ? parsed.map(normalizeFolder) : []);
      } else {
        const v3_folders = localStorage.getItem('prompt_canvas_folders_v3');
        if (v3_folders) {
          const parsed = JSON.parse(v3_folders);
          const normalized = Array.isArray(parsed) ? parsed.map(normalizeFolder) : [];
          setFolders(normalized);
          localStorage.setItem('prompt_canvas_folders_v4', JSON.stringify(normalized));
        }
      }
    } catch (e) {
      console.error('Failed to load storage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('prompt_canvas_keywords_v4', JSON.stringify(keywords));
      localStorage.setItem('prompt_canvas_folders_v4', JSON.stringify(folders));
    } catch (e) {
      console.warn('Failed to persist state to localStorage', e);
    }
  }, [keywords, folders]);

  const handleCopy = async (text: string, id?: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (id) {
          setKeywords(keywords.map(k => k.id === id ? { ...k, lastUsedAt: Date.now() } : k));
        }
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.warn('Failed to copy text:', err);
      // Fallback or just ignore if restricted
    }
  };

  const generateId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);

  const handleImageFile = (file: File, setter: (val: string | null) => void) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const runVision = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setUploadProgress(0);

    const simulation = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 92) return prev;
        const incremental = Math.random() * 15;
        return Math.min(prev + incremental, 92);
      });
    }, 400);

    try {
      const base64 = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      const result = await geminiService.analyzeImageToPrompt(base64, mimeType);
      setVisionResult(result);
      setUploadProgress(100);
      
      // Delay closing to let user see 100%
      setTimeout(() => {
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error(error);
      setLoading(false);
    } finally {
      clearInterval(simulation);
    }
  };

  const runStructure = async () => {
    if (!structureInput.trim()) return;
    setLoading(true);
    try {
      const result = await geminiService.structurePrompt(structureInput);
      setStructureResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateKeyword = (updated: SavedKeyword) => {
    setKeywords(keywords.map(k => k.id === updated.id ? updated : k));
    setEditingKeyword(null);
  };

  const deleteKeyword = (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id));
  };

  const openFolderEditor = (folder?: FolderModel) => {
    if (folder) {
      setEditingFolder(folder);
    } else {
      setEditingFolder({
        id: generateId(),
        name: '未命名文件夹',
        parentId: null,
        iconName: 'Folder',
        color: LIB_COLORS[0]
      });
    }
  };

  const saveFolder = () => {
    if (!editingFolder) return;
    const exists = folders.find(f => f.id === editingFolder.id);
    if (exists) {
      setFolders(folders.map(f => f.id === editingFolder.id ? editingFolder : f));
    } else {
      setFolders([...folders, editingFolder]);
    }
    setEditingFolder(null);
  };

  const deleteFolder = (id: string) => {
    if (!confirm("确定删除文件夹吗？文件夹内的关键词将被设为未分类。")) return;
    setFolders(folders.filter(f => f.id !== id));
    setKeywords(keywords.map(k => k.folderId === id ? { ...k, folderId: null } : k));
    if (activeFolderId === id) {
      setActiveFolderId(null);
      setActiveLibraryView('all');
    }
  };

  const moveFolder = (folderId: string, targetParentId: string | null) => {
    if (folderId === targetParentId) return;
    
    const isDescendant = (parent: string, child: string | null): boolean => {
      if (!child) return false;
      const childObj = folders.find(f => f.id === child);
      if (!childObj) return false;
      if (childObj.parentId === parent) return true;
      return isDescendant(parent, childObj.parentId);
    };

    if (targetParentId && isDescendant(folderId, targetParentId)) {
      console.warn("Folder loop detected. Operation cancelled.");
      setDropTargetId(null);
      setDraggedFolderId(null);
      return;
    }

    setFolders(folders.map(f => f.id === folderId ? { ...f, parentId: targetParentId } : f));
    setDropTargetId(null);
    setDraggedFolderId(null);
  };

  const getFilteredKeywords = () => {
    let base = keywords;
    if (activeLibraryView === 'favorites') base = keywords.filter(k => k.isFavorite);
    else if (activeLibraryView === 'unclassified') base = keywords.filter(k => !k.folderId);
    else if (activeLibraryView === 'untagged') base = keywords.filter(k => (k.tags || []).length === 0);
    else if (activeLibraryView === 'recent') base = [...keywords].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).slice(0, 20);
    else if (activeLibraryView === 'folder' && activeFolderId) base = keywords.filter(k => k.folderId === activeFolderId);

    const term = searchFilter.toLowerCase();
    return base.filter(k => 
      (k.title || '').toLowerCase().includes(term) ||
      (k.text || '').toLowerCase().includes(term) ||
      (k.tags || []).some(t => t.toLowerCase().includes(term))
    );
  };

  const themes = {
    dark: { 
      bg: 'bg-[#000000]', 
      sidebar: 'bg-[#0A0A0A]/90',
      accent: 'text-[#FF4D00]', 
      accentBg: 'bg-[#FF4D00]', 
      card: 'bg-[#0A0A0A] border-white/5 shadow-[0_10px_50px_rgba(0,0,0,1)]', 
      text: 'text-zinc-100',
      textSec: 'text-zinc-500',
      glass: 'bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/5'
    },
    light: { 
      bg: 'bg-[#F9F9F9]', 
      sidebar: 'bg-white/95',
      accent: 'text-[#FF4400]', 
      accentBg: 'bg-[#FF4400]', 
      card: 'bg-white border-black/5 shadow-xl shadow-black/5', 
      text: 'text-zinc-900',
      textSec: 'text-zinc-400',
      glass: 'bg-white/80 backdrop-blur-2xl border border-black/5'
    }
  };

  const currentTheme = themes[activeTheme];

  const getIconComponent = (name: string) => {
    const found = LIB_ICONS.find(i => i.name === name);
    return found ? found.icon : Folder;
  };

  return (
    <div className={`h-screen ${currentTheme.bg} ${currentTheme.text} flex flex-col overflow-hidden transition-colors duration-500`}>
      {/* Header */}
      <header className={`h-16 border-b border-white/5 flex items-center justify-between px-8 bg-white/5 backdrop-blur-md z-50 shrink-0 relative transition-colors duration-500`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTool('home')}
            className={`w-10 h-10 rounded-full bg-[#FF4D00] flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 group relative overflow-hidden ring-4 ring-white/5`}
          >
            <Flame className={`w-6 h-6 text-white relative z-10 transition-transform group-hover:rotate-12`} />
            <div className={`absolute inset-0 bg-white transition-opacity opacity-0 group-hover:opacity-20`} />
          </button>
          <div className={`text-lg font-bold tracking-tight ${currentTheme.text}`}>
            燃点视界 <span className={`font-light opacity-50 ml-1`}>提示词管理工具</span>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 glass max-w-fit overflow-hidden">
          {[
            { id: 'vision', label: '图片反推', icon: ImageIcon },
            { id: 'structure', label: '结构优化', icon: Layers },
            { id: 'library', label: '关键词库', icon: Library },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as Tool)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTool === tool.id 
                  ? `${currentTheme.accentBg} text-white shadow-md cursor-default` 
                  : `${currentTheme.textSec} hover:bg-white/5 cursor-pointer hover:text-white`
              }`}
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
            {[
              { id: 'light', icon: Sun },
              { id: 'dark', icon: Moon }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id as Theme)}
                className={`p-1.5 rounded-md transition-all ${
                  activeTheme === t.id ? 'bg-white/10 text-accent' : `opacity-40 hover:opacity-100 hover:bg-white/5 ${activeTheme === 'dark' ? 'text-white' : 'text-zinc-900'}`
                }`}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative p-4">
        <AnimatePresence mode="wait">
          {activeTool === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-4"
            >
              {/* Left Identity Section */}
              <div className="flex flex-col gap-4">
                <div className="glass rounded-[40px] p-10 flex flex-col gap-10">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-4">
                      <div className={`w-20 h-20 rounded-full border-4 border-white/10 bg-[#FF4D00] flex items-center justify-center shadow-2xl relative overflow-hidden group transition-transform hover:rotate-6 duration-500`}>
                        <Flame className={`w-10 h-10 text-white relative z-10 transition-transform group-hover:scale-110 duration-500`} />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                      </div>
                      <div className="space-y-0.5">
                        <h1 className="flex flex-col leading-tight">
                          <span className="text-2xl font-black tracking-tighter uppercase italic">燃点视界</span>
                          <span className="text-xs font-black tracking-[0.25em] opacity-40">RANDIAN VISION</span>
                        </h1>
                        <p className="text-[10px] opacity-20 font-bold tracking-widest uppercase">Prompt management tool // Matrix_v6.0</p>
                      </div>
                    </div>

                    <div className="flex gap-8 mt-2">
                      <div className="text-center">
                        <div className="text-xl font-black">{keywords.length}</div>
                        <div className="text-[9px] opacity-30 font-bold uppercase tracking-widest mt-1">Keywords<br/>数量</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black">{Array.from(new Set(keywords.flatMap(k => k.tags))).length}</div>
                        <div className="text-[9px] opacity-30 font-bold uppercase tracking-widest mt-1">Tags<br/>标签</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black">{keywords.filter(k => k.isFavorite).length}</div>
                        <div className="text-[9px] opacity-30 font-bold uppercase tracking-widest mt-1">Favorites<br/>收藏</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 rounded-[40px] relative overflow-hidden group bg-black">
                  <AnimatePresence initial={false}>
                    <motion.img 
                      key={currentCoverIndex}
                      src={coverImages[currentCoverIndex]} 
                      alt="Cover" 
                      initial={{ opacity: 0, scale: 1.1, filter: 'brightness(1.5) blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'brightness(1) blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.05, filter: 'brightness(0.5) blur(5px)' }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </AnimatePresence>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Image Controls */}
                  <div className="absolute top-8 right-8 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (coverImages.length > 1) {
                          const newImages = coverImages.filter((_, i) => i !== currentCoverIndex);
                          setCoverImages(newImages);
                          setCurrentCoverIndex(0);
                        }
                      }}
                      className="p-2 glass rounded-lg hover:bg-red-500/20 text-white transition-all"
                      title="删除当前背景"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.multiple = true;
                        input.onchange = async (ev) => {
                          const files = (ev.target as HTMLInputElement).files;
                          if (files && files.length > 0) {
                            const newBase64Images: string[] = [];
                            for (let i = 0; i < files.length; i++) {
                              const f = files[i];
                              const reader = new FileReader();
                              const promise = new Promise<string>((resolve) => {
                                reader.onload = (re) => resolve(re.target?.result as string);
                              });
                              reader.readAsDataURL(f);
                              newBase64Images.push(await promise);
                            }
                            setCoverImages([...coverImages, ...newBase64Images]);
                            setCurrentCoverIndex(coverImages.length);
                          }
                        };
                        input.click();
                      }}
                      className="p-2 glass rounded-lg hover:bg-accent text-white transition-all"
                      title="添加背景图 (支持多选)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Manual Controls */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 flex justify-between pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentCoverIndex((prev) => (prev - 1 + coverImages.length) % coverImages.length);
                      }}
                      className="w-12 h-12 glass rounded-full flex items-center justify-center pointer-events-auto hover:bg-white/10 transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentCoverIndex((prev) => (prev + 1) % coverImages.length);
                      }}
                      className="w-12 h-12 glass rounded-full flex items-center justify-center pointer-events-auto hover:bg-white/10 transition-all active:scale-95"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 space-y-6">
                    <div className="flex gap-2 mb-8 relative z-20">
                       {coverImages.map((_, idx) => (
                         <button 
                           key={idx}
                           onClick={(e) => {
                             e.stopPropagation();
                             setCurrentCoverIndex(idx);
                           }}
                           className={`h-1.5 rounded-full transition-all duration-500 hover:scale-y-150 active:scale-95 ${idx === currentCoverIndex ? 'w-8 bg-accent' : 'w-1.5 bg-white opacity-20'}`} 
                         />
                       ))}
                    </div>
                    <div className="space-y-0.5">
                      <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-[0.85]">RANDIAN<br/>VISION</h2>
                      <p className="text-xs font-bold tracking-[0.5em] text-white/40 uppercase mt-4">燃点视界 // AIGC // 提示词管理</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/50 max-w-xs font-medium uppercase tracking-tight">
                      Providing creators with high efficiency prompt services based on a thorough understanding of their needs and goals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Action Section */}
              <div className="glass rounded-[40px] p-10 flex flex-col relative">
                <div className="absolute top-10 right-10 flex flex-col items-end opacity-10">
                   <div className="text-8xl font-black tracking-tighter leading-none italic select-none">VISION</div>
                   <div className="text-8xl font-black tracking-tighter leading-none italic select-none">INTELLIGENCE</div>
                </div>

                <div className="flex items-center justify-between mb-12 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-xs font-black tracking-[0.2em] uppercase">Rapid reverse - deduction // 快速反推</span>
                   </div>
                   <div className="text-[10px] font-mono opacity-20 uppercase tracking-widest">System_Status: Optimal</div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                   <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full max-w-2xl aspect-video rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 group hover:bg-white/5 relative overflow-hidden ${selectedImage ? 'border-accent/40 bg-accent/5' : 'border-white/10'}`}
                   >
                     {selectedImage ? (
                        <>
                          <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-8" referrerPolicy="no-referrer" />
                          {loading && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-20">
                              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${uploadProgress}%` }}
                                  className="absolute inset-y-0 left-0 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.5)]"
                                />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black tracking-[0.3em] uppercase animate-pulse text-white">Matrix_Synchronizing...</span>
                                <span className="text-[24px] font-mono font-black mt-2 text-white">{Math.round(uploadProgress)}%</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full glass flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
                             <Upload className="w-8 h-8" />
                          </div>
                          <div className="text-center space-y-1">
                             <div className="text-sm font-bold tracking-widest uppercase">点击或拖拽以上传参考图</div>
                             <div className="text-[10px] opacity-30 font-medium uppercase tracking-[0.2em]">Matrix_Input_Channel</div>
                          </div>
                        </>
                     )}
                   </div>
                </div>

                <div className="mt-12 flex flex-col items-center relative z-10">
                   <div className="flex items-center gap-4 w-full max-w-sm">
                     <button 
                      onClick={() => {
                        if (!selectedImage) return;
                        runVision();
                        setShowExecutePopup(true);
                        setIsPopupCollapsed(false);
                      }}
                      disabled={!selectedImage || loading}
                      className="group relative flex-1"
                     >
                        <div className="absolute inset-0 bg-accent blur-3xl opacity-30 group-hover:opacity-60 transition-opacity" />
                        <div className="relative glass py-6 rounded-[24px] border border-white/10 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-98 overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF4D00]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] ease-in-out" />
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,77,0,0.15),transparent_50%)]" 
                             onMouseMove={(e) => {
                               const rect = e.currentTarget.getBoundingClientRect();
                               const x = ((e.clientX - rect.left) / rect.width) * 100;
                               const y = ((e.clientY - rect.top) / rect.height) * 100;
                               e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                               e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                             }}
                           />
                           <Zap className={`w-5 h-5 ${loading ? 'animate-pulse text-accent' : ''}`} />
                           <span className="text-sm font-bold tracking-[0.3em] uppercase">执行快速反推</span>
                           {loading && <Loader2 className="w-4 h-4 animate-spin opacity-40" />}
                        </div>
                     </button>

                     <AnimatePresence>
                        {showExecutePopup && isPopupCollapsed && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.5, y: 20, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: 20, rotate: 10 }}
                            whileHover={{ scale: 1.1, y: -4, rotate: 5 }}
                            whileTap={{ scale: 0.9, rotate: -5 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 400, 
                              damping: 25 
                            }}
                            onClick={() => setIsPopupCollapsed(false)}
                            className={`w-14 h-14 rounded-2xl glass border border-accent/40 flex flex-col items-center justify-center shadow-[0_15px_30px_rgba(255,77,0,0.2)] hover:bg-accent/10 transition-colors group relative overflow-hidden`}
                            title="恢复报告面板"
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
                            <motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                              <ChevronUp className="w-6 h-6 text-accent" />
                            </motion.div>
                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent animate-pulse" />
                          </motion.button>
                        )}
                     </AnimatePresence>
                   </div>
                   
                   <AnimatePresence>
                     {showExecutePopup && !isPopupCollapsed && (visionResult || loading) && (
                       <>
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className={`absolute inset-[-60px] z-40 backdrop-blur-3xl rounded-[40px] pointer-events-none transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-black/75' : 'bg-slate-200/40'}`}
                         />
                         <motion.div 
                          initial={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
                          className={`absolute bottom-[115%] mb-4 w-full max-w-2xl backdrop-blur-[120px] backdrop-saturate-[200%] p-8 rounded-[40px] border shadow-[0_50px_100px_rgba(0,0,0,0.5)] z-50 overflow-hidden group/popup transition-all duration-500 ${
                            activeTheme === 'dark' 
                              ? 'bg-white/[0.1] border-white/30 text-white' 
                              : 'bg-white/90 border-black/10 text-zinc-900 shadow-xl shadow-black/5'
                          }`}
                        >
                           <div className={`absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] transition-opacity duration-500 ${
                             activeTheme === 'dark' ? 'opacity-[0.15] brightness-150 contrast-150' : 'opacity-[0.05] brightness-100 contrast-100'
                           }`} />
                           
                           {/* Advanced Spectral Refraction & Specular Highlights */}
                           <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br transition-opacity duration-500 ${
                             activeTheme === 'dark' ? 'from-white/[0.25] via-transparent to-white/[0.05]' : 'from-black/[0.02] via-transparent to-black/[0.01]'
                           }`} />
                           <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent shadow-[0_1px_5px_rgba(255,255,255,0.3)] transition-all duration-500 ${
                             activeTheme === 'dark' ? 'via-white/[0.5]' : 'via-black/[0.05]'
                           }`} />
                           
                           <div className="relative z-10">
                             <div className="flex items-start justify-between mb-8">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                                   <Sparkles className="w-5 h-5 text-accent" />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className={`text-[11px] font-bold tracking-[0.2em] uppercase shadow-sm transition-colors ${activeTheme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Rapid reverse - deduction // 快速反推</span>
                                   <span className={`text-[9px] font-mono uppercase tracking-widest transition-opacity ${activeTheme === 'dark' ? 'text-white/80 opacity-80' : 'text-zinc-500 opacity-100'}`}>Core Analysis Result // v7.0 SPARK</span>
                                 </div>
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => {
                                    try {
                                      const data = JSON.parse(visionResult);
                                      handleCopy(data.fullPrompt || visionResult);
                                    } catch {
                                      handleCopy(visionResult);
                                    }
                                  }} 
                                  className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
                                  title="复制结果"
                                >
                                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 opacity-100" />}
                                </button>
                                <button 
                                  onClick={() => setIsPopupCollapsed(true)} 
                                  className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 group"
                                  title="收起面板"
                                >
                                  <ChevronDown className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all" />
                                </button>
                                <button 
                                  onClick={() => setShowExecutePopup(false)} 
                                  className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/5 group"
                                  title="关闭结果"
                                >
                                  <X className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                </button>
                              </div>
                           </div>
                           <div className="max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                              {loading ? (
                                <div className="py-20 flex flex-col items-center gap-4">
                                  <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Matrix Processing...</span>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {(() => {
                                     try {
                                       const data = JSON.parse(visionResult);
                                       return (
                                         <div className="grid grid-cols-1 gap-6">
                                            {/* 1. 完整长提示词 */}
                                            <div className={`${activeTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'} p-6 rounded-3xl border group hover:border-accent/30 transition-all relative overflow-hidden`}>
                                               <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                                                  <FileText className="w-12 h-12" />
                                               </div>
                                               <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(255,77,0,0.5)]" />
                                                  一、完整长提示词 (直接复制可用)
                                               </div>
                                               <div className={`text-[15px] leading-relaxed font-medium ${currentTheme.text}`}>{data.fullPrompt}</div>
                                            </div>

                                            {/* 2. 维度拆解 */}
                                            <div className="space-y-4">
                                              <div className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2 text-accent/60">
                                                <Grid className="w-3 h-3" /> 二、维度拆解 (方便按需调整)
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <div className={`${activeTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'} p-5 rounded-3xl border transition-all hover:bg-white/[0.02]`}>
                                                    <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-2 flex items-center gap-2 text-accent/40">核心主体与细节</div>
                                                    <div className={`text-[13px] leading-relaxed ${currentTheme.text}`}>{data.dimensions.subject}</div>
                                                 </div>
                                                 <div className={`${activeTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'} p-5 rounded-3xl border transition-all hover:bg-white/[0.02]`}>
                                                    <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-2 flex items-center gap-2 text-accent/40">场景与构图</div>
                                                    <div className={`text-[13px] leading-relaxed ${currentTheme.text}`}>{data.dimensions.scene}</div>
                                                 </div>
                                                 <div className={`${activeTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'} p-5 rounded-3xl border transition-all hover:bg-white/[0.02]`}>
                                                    <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-2 flex items-center gap-2 text-accent/40">光影与色彩</div>
                                                    <div className={`text-[13px] leading-relaxed ${currentTheme.text}`}>{data.dimensions.lighting}</div>
                                                 </div>
                                                 <div className={`${activeTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/[0.05]'} p-5 rounded-3xl border transition-all hover:bg-white/[0.02]`}>
                                                    <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-2 flex items-center gap-2 text-accent/40">风格与画质</div>
                                                    <div className={`text-[13px] leading-relaxed ${currentTheme.text}`}>{data.dimensions.style}</div>
                                                 </div>
                                              </div>
                                            </div>

                                            {/* 3. 精简版提示词 */}
                                            <div className={`${activeTheme === 'dark' ? 'bg-accent/5 border-accent/20' : 'bg-accent/[0.02] border-accent/10'} p-6 rounded-3xl border`}>
                                              <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                 <Zap className="w-3.5 h-3.5" /> 三、精简版提示词 (快速生成用)
                                              </div>
                                              <div className={`text-[14px] font-mono leading-relaxed p-4 rounded-xl ${activeTheme === 'dark' ? 'bg-black/40' : 'bg-white'} border border-accent/10 select-all`}>
                                                {data.shortPrompt}
                                              </div>
                                            </div>

                                            {/* 4. 国内工具优化技巧 */}
                                            <div className="space-y-4">
                                              <div className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] ml-2 flex items-center gap-2 text-accent/60">
                                                <Sparkles className="w-3 h-3" /> 四、国内工具优化技巧
                                              </div>
                                              <div className="grid grid-cols-1 gap-2 text-accent/80">
                                                {data.tips.map((tip: string, i: number) => (
                                                  <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl ${activeTheme === 'dark' ? 'bg-white/5' : 'bg-black/[0.02]'}`}>
                                                    <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                      <span className="text-[10px] font-black text-accent">{i + 1}</span>
                                                    </div>
                                                    <div className={`text-[13px] font-medium leading-relaxed ${currentTheme.text}`}>{tip}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                         </div>
                                       );
                                     } catch {
                                       return <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{visionResult}</p>;
                                     }
                                  })()}
                                </div>
                              )}
                           </div>
                           {!loading && visionResult && (
                             <div className="mt-10 flex gap-4 text-accent">
                               <select 
                                 className="flex-1 glass rounded-2xl px-6 py-2 text-xs font-bold uppercase tracking-widest appearance-none bg-transparent"
                                 onChange={(e) => setActiveFolderId(e.target.value || null)}
                                 value={activeFolderId || ''}
                               >
                                 <option value="" className="bg-zinc-900">推送到节点...</option>
                                 {folders.map(f => <option key={f.id} value={f.id} className="bg-zinc-900">{f.name}</option>)}
                               </select>
                               <button 
                                 onClick={() => {
                                   let content = visionResult;
                                   let tags: string[] = ["VISION"];
                                   try {
                                     const data = JSON.parse(visionResult);
                                     content = data.fullPrompt;
                                     if (data.dimensions?.style) tags.push(data.dimensions.style);
                                   } catch {}
                                   
                                   const newKeyword: SavedKeyword = { 
                                     id: generateId(), 
                                     title: 'VISION_SYNC_' + Date.now().toString().slice(-4), 
                                     text: content, 
                                     tags: tags, 
                                     thumbnail: selectedImage, 
                                     folderId: activeFolderId, 
                                     isFavorite: false, 
                                     rating: 0, 
                                     createdAt: Date.now() 
                                   };
                                   setKeywords([newKeyword, ...keywords]);
                                   setActiveTool('library');
                                   setShowExecutePopup(false);
                                 }}
                                 className={`${currentTheme.accentBg} text-white px-10 py-5 rounded-[24px] flex items-center gap-3 text-xs font-black tracking-[0.2em] transition-all hover:scale-[1.03] active:scale-98 shadow-[0_20px_40px_rgba(255,77,0,0.3)] uppercase shrink-0`}
                               >
                                 <Save className="w-5 h-5" /> Push to Stack
                               </button>
                             </div>
                           )}
                           </div>
                        </motion.div>
                      </>
                     )}
                   </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : activeTool !== 'library' ? (
            <motion.div 
              key="tools"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex gap-4"
            >
              <div className="w-[420px] shrink-0 glass rounded-3xl p-6 flex flex-col gap-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-widest opacity-40 uppercase">
                      {activeTool === 'vision' ? '输入图片 // Input pictures' : `输入矩阵 // ${activeTool}`}
                    </h3>
                    <div className={`${currentTheme.accent}`}><Sparkles className="w-4 h-4" /></div>
                 </div>

                 {activeTool === 'vision' ? (
                   <div className="flex-1 flex flex-col gap-4">
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsHoveringImage(true); }}
                        onDragLeave={() => setIsHoveringImage(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsHoveringImage(false);
                          const file = e.dataTransfer.files[0];
                          if (file) handleImageFile(file, setSelectedImage);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 glass rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden ${isHoveringImage ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'}`}
                      >
                        {selectedImage ? (
                          <img src={selectedImage} alt="Preview" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-center opacity-40 group-hover:opacity-60">
                            <Upload className="w-12 h-12 mb-4 mx-auto" />
                            <p className="text-[10px] font-bold tracking-widest uppercase">拖拽图片或点击上传</p>
                          </div>
                        )}
                      </div>
                      <button onClick={runVision} disabled={loading || !selectedImage} className={`w-full ${currentTheme.accentBg} py-4 rounded-xl font-bold text-white shadow-xl shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-30 transition-all`}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        执行图片反推
                      </button>
                   </div>
                 ) : (
                    <div className="flex-1 flex flex-col gap-4">
                       <textarea
                        value={structureInput}
                        onChange={(e) => setStructureInput(e.target.value)}
                        placeholder="在此接入提示词正文..."
                        className="flex-1 glass rounded-2xl p-6 text-sm resize-none focus:outline-none focus:ring-1 ring-accent/30 font-mono"
                      />
                      <button onClick={runStructure} disabled={loading || !structureInput} className={`w-full ${currentTheme.accentBg} py-4 rounded-xl font-bold text-white shadow-xl shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-30 transition-all text-sm`}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                        结构化重组加载
                      </button>
                    </div>
                 )}
              </div>

              <div className="flex-1 glass rounded-3xl p-8 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-8 opacity-40">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase">OUTPUT_MATRIX // 系统输出</h3>
                  <div className="text-[9px] font-mono tracking-tighter">CORE_ENGINE_STABLE // PROMPT_READY</div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   {loading ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 gap-6">
                        <Loader2 className="w-12 h-12 animate-spin stroke-[1]" />
                        <span className="text-[10px] font-bold tracking-[0.5em] uppercase">核心引擎算力同步中...</span>
                     </div>
                   ) : (
                      <div className="space-y-6">
                         {(activeTool === 'vision' ? visionResult : structureResult) ? (
                            <div className="space-y-6">
                               <div className="glass rounded-3xl p-8 relative group border border-white/5">
                                  <button onClick={() => handleCopy(activeTool === 'vision' ? visionResult : structureResult)} className="absolute top-6 right-6 p-2 glass rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent">
                                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                  <p className="font-mono text-[15px] leading-relaxed whitespace-pre-wrap">{activeTool === 'vision' ? visionResult : structureResult}</p>
                               </div>
                               <button 
                                 onClick={() => {
                                   setEditingKeyword({ id: generateId(), title: '新发现片段', text: activeTool === 'vision' ? visionResult : structureResult, tags: [], thumbnail: null, folderId: null, isFavorite: false, rating: 0, createdAt: Date.now() });
                                   setActiveTool('library');
                                 }} 
                                 className="flex items-center gap-2 text-xs font-bold text-accent hover:underline uppercase tracking-widest"
                               >
                                 <Plus className="w-4 h-4" /> 保存至关键词库
                               </button>
                            </div>
                         ) : (
                            <div className="h-full mt-32 flex flex-col items-center justify-center opacity-10 gap-4">
                              <Palette className="w-20 h-20 stroke-[0.5]" />
                              <span className="text-[11px] font-bold tracking-[0.4em] uppercase">等待执行算力指令</span>
                            </div>
                         )}
                      </div>
                   )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex gap-4"
            >
              {/* Sidebar Toolbar */}
              <div className={`w-[240px] shrink-0 glass rounded-3xl p-6 flex flex-col gap-8 ${currentTheme.sidebar}`}>
                 <div className="space-y-2">
                    <h4 className="text-[10px] font-bold opacity-30 uppercase tracking-widest ml-1 text-accent">管理视图</h4>
                    {[
                      { id: 'all', label: '全部项目', icon: Grid },
                      { id: 'favorites', label: '我的收藏', icon: Star },
                      { id: 'unclassified', label: '未分类堆栈', icon: Folder },
                      { id: 'untagged', label: '待贴标模组', icon: Tag },
                      { id: 'recent', label: '最近频繁', icon: History },
                    ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveLibraryView(item.id as LibraryView); setActiveFolderId(null); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${activeLibraryView === item.id && !activeFolderId ? `${currentTheme.accentBg} text-white shadow-lg` : `hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100`}`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </button>
                    ))}
                 </div>

                 <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-[#FF4D00]">算力矩阵节点</h4>
                      <button onClick={() => openFolderEditor()} className="p-1 hover:bg-white/10 rounded-md text-[#FF4D00] transition-colors"><FolderPlus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                      <AnimatePresence>
                        {draggedFolderId && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 32, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onDragOver={(e) => { e.preventDefault(); setDropTargetId('root'); }}
                            onDrop={() => moveFolder(draggedFolderId, null)}
                            className={`border-2 border-dashed rounded-xl flex items-center justify-center text-[9px] uppercase font-bold transition-all ${dropTargetId === 'root' ? 'border-accent bg-accent/20 opacity-100' : 'border-white/10 opacity-40'}`}
                          >
                            释放以移至根目录
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {(() => {
                        const renderFolders = (parentId: string | null, depth = 0) => {
                          if (depth > 8) return null;
                          return folders
                            .filter(f => f.parentId === parentId)
                            .map(folder => {
                              const IconComp = getIconComponent(folder.iconName);
                              return (
                                <div key={folder.id} className="space-y-1">
                                  <div 
                                    draggable
                                    onDragStart={() => setDraggedFolderId(folder.id)}
                                    onDragEnd={() => { setDraggedFolderId(null); setDropTargetId(null); }}
                                    onDragOver={(e) => {
                                      if (draggedFolderId && draggedFolderId !== folder.id) {
                                        e.preventDefault();
                                        setDropTargetId(folder.id);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (draggedFolderId) {
                                        e.preventDefault();
                                        moveFolder(draggedFolderId, folder.id);
                                      }
                                    }}
                                    className={`group relative transition-all ${dropTargetId === folder.id ? 'scale-[1.03] ring-1 ring-accent z-10' : ''}`}
                                    style={{ marginLeft: `${depth * 16}px` }}
                                  >
                                    {depth > 0 && (
                                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3.5 h-px bg-accent/20" />
                                    )}
                                    <button 
                                      onClick={() => { setActiveFolderId(folder.id); setActiveLibraryView('folder'); }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] transition-all ${activeFolderId === folder.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                    >
                                      <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color }} />
                                      <span className="truncate flex-1 text-left">{folder.name}</span>
                                      <span className="text-[10px] opacity-30 font-mono">[{keywords.filter(k => k.folderId === folder.id).length}]</span>
                                    </button>
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-black/60 rounded-lg backdrop-blur-md">
                                       <button onClick={() => openFolderEditor(folder)} className="p-1.5 hover:text-accent"><Pencil className="w-3 h-3" /></button>
                                       <button onClick={() => deleteFolder(folder.id)} className="p-1.5 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                  {renderFolders(folder.id, depth + 1)}
                                </div>
                              );
                            });
                        };
                        return renderFolders(null);
                      })()}
                    </div>
                 </div>
              </div>

              {/* Main List Area */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="h-16 shrink-0 glass rounded-3xl px-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <span className={`text-sm font-bold opacity-80 uppercase tracking-widest ${currentTheme.text}`}>
                      {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 
                       activeLibraryView === 'all' ? '全部系统存储' : 
                       activeLibraryView === 'favorites' ? '精华算力收藏' :
                       activeLibraryView === 'unclassified' ? '未分类堆栈' : 
                       activeLibraryView === 'untagged' ? '待贴标模组' : '频繁调用单元'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-3 px-4 py-1.5 glass rounded-2xl border border-white/5">
                        <Grid className="w-3.5 h-3.5 opacity-30" />
                        <input 
                          type="range" 
                          min="0.6" 
                          max="1.4" 
                          step="0.1" 
                          value={zoomLevel} 
                          onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                          className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF4D00]"
                        />
                        <Grid className="w-4.5 h-4.5 opacity-40 scale-125" />
                     </div>

                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                        <input 
                          value={searchFilter} 
                          onChange={(e) => setSearchFilter(e.target.value)} 
                          placeholder="搜索关键词或标签..." 
                          className={`glass pl-10 pr-4 py-2.5 rounded-2xl text-[11px] w-64 focus:ring-1 ring-accent/30 ${currentTheme.text}`} 
                        />
                     </div>
                      <button 
                        onClick={() => {
                          if (activeLibraryView === 'untagged') {
                            setEditingKeyword({ id: generateId(), title: '新标签项目', text: '', tags: [], thumbnail: null, folderId: activeFolderId, isFavorite: false, rating: 0, createdAt: Date.now() });
                          } else {
                            setEditingKeyword({ id: generateId(), title: '新关键词', text: '', tags: [], thumbnail: null, folderId: activeFolderId, isFavorite: false, rating: 0, createdAt: Date.now() });
                          }
                        }}
                        className={`${currentTheme.accentBg} text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-98 transition-all uppercase tracking-tighter`}
                      >
                        <Plus className="w-4 h-4" /> {activeLibraryView === 'untagged' ? '标签' : '关键词'}
                      </button>
                  </div>
                </div>

                {/* Recent Tags Assistant */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-6 bg-white/2 dark:bg-black/5 py-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/20">
                    <History className="w-3.5 h-3.5 text-accent animate-pulse" />
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] whitespace-nowrap">最近联想单元</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {Array.from(new Set(
                      keywords
                        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
                        .flatMap(k => k.tags || [])
                    )).slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSearchFilter(tag)}
                        className={`px-3 py-1.5 glass rounded-xl text-[10px] font-bold transition-all whitespace-nowrap border border-white/5 hover:border-accent/40 hover:text-accent hover:bg-accent/5 ${searchFilter === tag ? 'bg-accent/10 border-accent/30 text-accent' : 'opacity-40 hover:opacity-100'}`}
                      >
                        #{tag}
                      </button>
                    ))}
                    {keywords.flatMap(k => k.tags || []).length === 0 && (
                      <span className="text-[10px] opacity-20 italic ml-2">算力堆栈中暂无活跃标签节点</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div 
                    className="grid gap-4 pb-12"
                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${300 * zoomLevel}px, 1fr))` }}
                  >
                     {getFilteredKeywords().map(item => (
                       <motion.div 
                         key={item.id} 
                         layout
                         onClick={() => setEditingKeyword(item)}
                         className={`group glass rounded-3xl overflow-hidden border border-white/5 hover:border-accent/40 transition-all cursor-pointer flex flex-col relative ${currentTheme.card}`}
                       >
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setKeywords(keywords.map(k => k.id === item.id ? { ...k, isFavorite: !k.isFavorite } : k));
                             }}
                             className={`absolute top-4 right-4 z-10 w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center transition-all ${item.isFavorite ? 'text-accent scale-110 shadow-[0_0_15px_rgba(255,77,0,0.3)]' : 'opacity-0 group-hover:opacity-100 hover:scale-110'}`}
                          >
                             <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-accent' : ''}`} />
                          </button>

                          <div className="h-40 bg-white/5 relative overflow-hidden shrink-0">
                             {item.thumbnail ? (
                               <img src={item.thumbnail} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center opacity-5">
                                 <ImageIcon className="w-12 h-12" />
                               </div>
                             )}
                          </div>
                          
                          <div className="p-6 flex flex-col gap-4 flex-1 min-w-0">
                             <div className="space-y-1.5">
                                <h4 className={`text-[15px] font-bold truncate ${currentTheme.text}`}>{item.title || '未命名标题'}</h4>
                                <div className="flex items-center gap-0.5">
                                   {[1, 2, 3, 4, 5].map(star => (
                                     <Star key={star} className={`w-3 h-3 ${star <= (item.rating || 0) ? 'fill-[#FF4D00] text-[#FF4D00]' : 'opacity-10'}`} />
                                   ))}
                                </div>
                             </div>

                             <div className="flex flex-wrap gap-1.5">
                                {item.tags.slice(0, 3).map(t => (
                                  <span key={t} className="px-2.5 py-0.5 glass rounded-lg text-[10px] font-medium text-accent bg-accent/5">#{t}</span>
                                ))}
                                {item.tags.length > 3 && <span className="text-[10px] opacity-30 font-bold">+{item.tags.length - 3}</span>}
                             </div>

                             <p className={`text-[13px] font-normal leading-relaxed opacity-60 line-clamp-3 flex-1 ${currentTheme.text}`}>{item.text}</p>
                             
                             <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                                <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); handleCopy(item.text, item.id); }} className="p-2 glass rounded-xl hover:text-accent hover:scale-110 transition-all"><Copy className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteKeyword(item.id); }} className="p-2 glass rounded-xl hover:text-red-400 hover:scale-110 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                          </div>
                       </motion.div>
                     ))}
                     {getFilteredKeywords().length === 0 && (
                        <div className="col-span-full h-96 flex flex-col items-center justify-center opacity-10 gap-4">
                           <Library className="w-24 h-24 stroke-[0.3]" />
                           <span className="text-sm font-bold tracking-[0.4em] uppercase">空存储矩阵</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Hidden Elements */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file, setSelectedImage);
          e.target.value = ''; // Reset for consecutive same-file uploads
        }} 
        className="hidden" 
        accept="image/*" 
      />

      {/* Keyword Editor Modal */}
      <AnimatePresence>
        {editingKeyword && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className={`w-full max-w-5xl rounded-[40px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative ${currentTheme.glass}`}
             >
                <div className="h-20 flex items-center justify-between px-10 border-b border-white/5">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${currentTheme.accentBg} flex items-center justify-center shadow-lg shadow-accent/30 animate-pulse`}>
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold tracking-widest text-[#FF4D00] uppercase">关键词矩阵编辑器</span>
                        <span className="text-[10px] opacity-40 uppercase tracking-[0.3em]">Ignite Matrix Node // Configuration</span>
                      </div>
                   </div>
                   <button onClick={() => setEditingKeyword(null)} className="p-3 hover:bg-white/5 rounded-full transition-all group">
                     <X className="w-7 h-7 opacity-30 group-hover:opacity-100 group-hover:rotate-90 transition-all" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                   <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
                      <div className="space-y-10">
                         <div className="space-y-4">
                            <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em] ml-2">节点主标题</label>
                            <input 
                              type="text"
                              value={editingKeyword.title}
                              onChange={(e) => setEditingKeyword({ ...editingKeyword, title: e.target.value })}
                              placeholder="给提示词起个易识别的名字..."
                              className="w-full glass rounded-2xl px-6 py-4 text-[16px] font-bold focus:ring-2 ring-[#FF4D00]/20 transition-all"
                            />
                         </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between ml-2">
                               <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em]">提示词载荷内容</label>
                               <div className="text-[10px] font-mono opacity-20">CHARS: {editingKeyword.text.length}</div>
                            </div>
                            <textarea
                              value={editingKeyword.text}
                              onChange={(e) => setEditingKeyword({ ...editingKeyword, text: e.target.value })}
                              placeholder="在这里编辑核心载荷..."
                              className="w-full h-[400px] glass rounded-[32px] p-8 text-[16px] leading-[1.8] resize-none focus:outline-none focus:ring-2 ring-accent/20 font-mono shadow-inner custom-scrollbar"
                            />
                         </div>
                      </div>

                      <div className="space-y-10">
                         <div className="space-y-4">
                            <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em] ml-2">多维评估 & 收藏</label>
                            <div className="glass p-6 rounded-3xl flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <button 
                                      key={star} 
                                      onClick={() => setEditingKeyword({ ...editingKeyword, rating: star })}
                                      className="transition-transform hover:scale-125"
                                    >
                                      <Star className={`w-6 h-6 ${star <= editingKeyword.rating ? 'fill-[#FF4D00] text-[#FF4D00]' : 'opacity-10'}`} />
                                    </button>
                                  ))}
                               </div>
                               <button 
                                 onClick={() => setEditingKeyword({ ...editingKeyword, isFavorite: !editingKeyword.isFavorite })}
                                 className={`w-12 h-12 rounded-2xl glass flex items-center justify-center transition-all ${editingKeyword.isFavorite ? 'bg-accent/20 text-accent scale-110 shadow-lg ring-1 ring-accent/50' : 'opacity-20 hover:opacity-100'}`}
                               >
                                 <Heart className={`w-6 h-6 ${editingKeyword.isFavorite ? 'fill-accent' : ''}`} />
                               </button>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em] ml-2">视觉参考映射</label>
                            <div 
                              onClick={() => editThumbInputRef.current?.click()}
                              className="aspect-[4/3] glass rounded-[32px] border-2 border-dashed border-white/5 hover:border-accent/40 transition-all cursor-pointer overflow-hidden relative group"
                            >
                               {editingKeyword.thumbnail ? (
                                 <img src={editingKeyword.thumbnail} alt="Ref" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                               ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center opacity-20 gap-3 group-hover:opacity-40 transition-all">
                                    <Upload className="w-8 h-8 group-hover:translate-y-[-5px] transition-transform" />
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em]">上传逻辑缩略图</span>
                                 </div>
                               )}
                               <input type="file" ref={editThumbInputRef} onChange={(e) => handleImageFile(e.target.files?.[0] as File, (val) => setEditingKeyword({ ...editingKeyword, thumbnail: val }))} className="hidden" accept="image/*" />
                               {editingKeyword.thumbnail && (
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-[11px] text-white font-bold px-6 py-2 glass rounded-full tracking-widest uppercase">Change Logic Map</span>
                                 </div>
                               )}
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between ml-2">
                               <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em]">多维标签模组</label>
                               <Tag className="w-3.5 h-3.5 opacity-20" />
                            </div>
                            <div className="flex flex-wrap gap-2 p-2 glass rounded-[24px]">
                               {(editingKeyword.tags || []).map(tag => (
                                 <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl text-xs font-bold text-accent transition-all hover:bg-accent/20">
                                   #{tag}
                                   <button onClick={() => setEditingKeyword({ ...editingKeyword, tags: editingKeyword.tags.filter(t => t !== tag) })} className="hover:text-white transition-colors">
                                     <X className="w-3.5 h-3.5" />
                                   </button>
                                 </span>
                               ))}
                               <div className="relative flex-1 min-w-[120px]">
                                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                                  <input 
                                    type="text"
                                    placeholder="NEW_TAG..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val && !editingKeyword.tags.includes(val)) {
                                          setEditingKeyword({ ...editingKeyword, tags: [...editingKeyword.tags, val] });
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }
                                    }}
                                    className="w-full bg-transparent pl-12 pr-6 py-3 text-xs font-bold tracking-widest focus:outline-none"
                                  />
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <label className="text-[11px] font-bold opacity-30 uppercase tracking-[0.3em] ml-2">存放算力节点</label>
                            <select 
                              value={editingKeyword.folderId || ''} 
                              onChange={(e) => setEditingKeyword({ ...editingKeyword, folderId: e.target.value || null })}
                              className="w-full glass rounded-2xl p-5 text-sm focus:ring-2 ring-accent/20 bg-transparent"
                            >
                               <option value="" className="bg-[#141416]">未分类堆栈 // UNCLASSIFIED</option>
                               {folders.map(f => <option key={f.id} value={f.id} className="bg-[#141416] text-white">{f.name}</option>)}
                            </select>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="h-24 bg-black/20 backdrop-blur-3xl px-12 flex items-center justify-end gap-6 border-t border-white/5">
                   <button onClick={() => setEditingKeyword(null)} className="px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Abort Changes</button>
                   <button 
                     onClick={() => {
                        const isExisting = keywords.some(k => k.id === editingKeyword.id);
                        if (isExisting) updateKeyword(editingKeyword);
                        else {
                          setKeywords([editingKeyword, ...keywords]);
                          setEditingKeyword(null);
                        }
                     }}
                     className={`${currentTheme.accentBg} text-white px-14 py-4 rounded-2xl text-xs font-bold shadow-[0_10px_30px_rgba(255,77,0,0.3)] flex items-center gap-3 hover:scale-[1.03] active:scale-[0.97] transition-all uppercase tracking-[0.2em]`}
                   >
                     <Save className="w-5 h-5" />
                     Push Sync Data
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Editor Modal */}
      <AnimatePresence>
        {editingFolder && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="w-[480px] glass rounded-[40px] p-10 border border-white/10 shadow-2xl space-y-8"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-[12px] font-bold tracking-[0.4em] uppercase opacity-30">节点配置 // Folder Config</h3>
                   <button onClick={() => setEditingFolder(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5 opacity-40 hover:opacity-100" /></button>
                </div>

                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold opacity-30 uppercase tracking-widest ml-1">节点名称</label>
                      <input 
                        value={editingFolder.name}
                        onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                        className="w-full glass p-5 rounded-2xl font-bold focus:ring-2 ring-accent/30 text-[16px]"
                        placeholder="NAME_YOUR_NODE"
                        autoFocus
                      />
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold opacity-30 uppercase tracking-widest ml-1">逻辑图标</label>
                      <div className="grid grid-cols-6 gap-3 p-5 glass rounded-[28px] max-h-[220px] overflow-y-auto custom-scrollbar">
                         {LIB_ICONS.map(item => (
                           <button 
                             key={item.name}
                             onClick={() => setEditingFolder({ ...editingFolder, iconName: item.name })}
                             className={`aspect-square flex items-center justify-center rounded-xl transition-all ${editingFolder.iconName === item.name ? 'bg-accent/20 text-accent scale-110 shadow-lg ring-1 ring-accent/50' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                           >
                              <item.icon className="w-5 h-5" />
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold opacity-30 uppercase tracking-widest ml-1">标识辨识色</label>
                      <div className="flex flex-wrap gap-3.5 p-5 glass rounded-[28px]">
                         {LIB_COLORS.map(c => (
                           <button 
                             key={c}
                             onClick={() => setEditingFolder({ ...editingFolder, color: c })}
                             className={`w-8 h-8 rounded-full transition-all ${editingFolder.color === c ? 'ring-2 ring-white ring-offset-4 ring-offset-zinc-950 scale-110' : 'scale-90 opacity-40 hover:opacity-100 hover:scale-100'}`}
                             style={{ backgroundColor: c }}
                           />
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button onClick={() => setEditingFolder(null)} className="flex-1 py-5 glass rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-all">Abort</button>
                   <button onClick={saveFolder} className={`flex-1 ${currentTheme.accentBg} text-white py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-[1.03] transition-all`}>Save Node</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="h-10 px-8 flex items-center justify-between text-[10px] font-medium opacity-20 glass shrink-0 relative z-50 uppercase tracking-[0.2em] border-t border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_#34C759]" />ONLINE_NODE</div>
          <div className="font-mono">Sync: Matrix Protocol v6.0 // Secured</div>
        </div>
        <div className="flex items-center gap-6 font-mono">
           <span className="hidden md:block">Ignite Prompt Studio // {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
