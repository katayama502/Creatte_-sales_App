import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  updateDoc,
  query
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  DollarSign, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X,
  TrendingUp,
  Users,
  Target,
  Handshake,
  BookOpen,
  Calendar,
  ChevronRight
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyA7Ni5Dt1IgBdsYkF60H8uhGEU5Vr52JZU",
  authDomain: "creator-biz-manager.firebaseapp.com",
  projectId: "creator-biz-manager",
  storageBucket: "creator-biz-manager.firebasestorage.app",
  messagingSenderId: "603504789222",
  appId: "1:603504789222:web:80efcfe68bd2f405a2dd27"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sales-lead-manager';

// --- Constants ---
const STATUS_OPTIONS = [
  { id: 'new', label: '未対応', color: 'bg-blue-100 text-blue-700' },
  { id: 'contacted', label: 'アプローチ中', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'proposed', label: '提案済み', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'negotiating', label: '最終交渉中', color: 'bg-purple-100 text-purple-700' },
  { id: 'won', label: '成約', color: 'bg-green-100 text-green-700' },
  { id: 'lost', label: '失注', color: 'bg-gray-100 text-gray-700' },
];

const LEAD_TYPES = [
  { id: 'sponsorship', label: '協賛', icon: Handshake, color: 'text-orange-600' },
  { id: 'training', label: '企業研修', icon: BookOpen, color: 'text-blue-600' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: '',
    status: 'new',
    type: 'sponsorship',
    category: '', // Event name or Training course
    nextDate: '',
    nextStep: '',
    notes: ''
  });

  // --- Auth logic ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Firestore sync ---
  useEffect(() => {
    if (!user) return;

    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    const unsubscribe = onSnapshot(leadsRef, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData(lead);
    } else {
      setEditingLead(null);
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        value: '',
        status: 'new',
        type: 'sponsorship',
        category: '',
        nextDate: '',
        nextStep: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    const leadData = {
      ...formData,
      value: Number(formData.value) || 0,
      updatedAt: Date.now(),
      createdAt: editingLead ? editingLead.createdAt : Date.now(),
      userId: user.uid
    };

    try {
      if (editingLead) {
        const leadDoc = doc(db, 'artifacts', appId, 'public', 'data', 'leads', editingLead.id);
        await updateDoc(leadDoc, leadData);
      } else {
        const newDocRef = doc(leadsRef);
        await setDoc(newDocRef, leadData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このリードを削除してもよろしいですか？")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id));
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.category && lead.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesType = filterType === 'all' || lead.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leads, searchTerm, filterStatus, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const active = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
    const sponsorshipValue = active.filter(l => l.type === 'sponsorship').reduce((acc, curr) => acc + curr.value, 0);
    const trainingValue = active.filter(l => l.type === 'training').reduce((acc, curr) => acc + curr.value, 0);
    const wonTotal = leads.filter(l => l.status === 'won').reduce((acc, curr) => acc + curr.value, 0);
    
    return { sponsorshipValue, trainingValue, wonTotal, activeCount: active.length };
  }, [leads]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-indigo-600 p-2 rounded-xl mr-3">
                <Target className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-none">Creator Biz Manager</h1>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Sponsorship & Training CRM</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline font-semibold">新規案件登録</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase">進行中案件数</span>
              <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-600" /></div>
            </div>
            <div className="text-2xl font-black">{stats.activeCount} <span className="text-xs font-normal text-slate-400">件</span></div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase">協賛見込み</span>
              <div className="p-2 bg-orange-50 rounded-lg"><Handshake className="w-4 h-4 text-orange-600" /></div>
            </div>
            <div className="text-2xl font-black text-orange-700">¥{stats.sponsorshipValue.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase">研修見込み</span>
              <div className="p-2 bg-blue-50 rounded-lg"><BookOpen className="w-4 h-4 text-blue-600" /></div>
            </div>
            <div className="text-2xl font-black text-blue-700">¥{stats.trainingValue.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase">今期成約合計</span>
              <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
            </div>
            <div className="text-2xl font-black text-green-700">¥{stats.wonTotal.toLocaleString()}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="企業名、担当者、イベント名で検索..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                全種別
              </button>
              {LEAD_TYPES.map(type => (
                <button 
                  key={type.id}
                  onClick={() => setFilterType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <select 
              className="bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-600 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">すべてのステータス</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lead List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-200 w-10 h-10" />
              </div>
              <h3 className="text-slate-800 font-bold mb-1">データが見つかりません</h3>
              <p className="text-slate-400 text-sm">検索条件を変えるか、新しい案件を追加してください。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">リード / 企業情報</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">案件詳細</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">次回アクション</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const typeInfo = LEAD_TYPES.find(t => t.id === lead.type);
                    const TypeIcon = typeInfo?.icon || Target;
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg bg-slate-100 mr-3 ${typeInfo?.color}`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{lead.name}</div>
                              <div className="text-xs text-slate-500">{lead.company}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-semibold text-slate-700">{lead.category || '未設定'}</div>
                          <div className="text-xs text-slate-400 flex items-center mt-1">
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            ¥{lead.value.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_OPTIONS.find(s => s.id === lead.status)?.color || 'bg-slate-100'}`}>
                            {STATUS_OPTIONS.find(s => s.id === lead.status)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {lead.nextDate || lead.nextStep ? (
                            <div className="space-y-1">
                              {lead.nextDate && (
                                <div className="text-[10px] font-bold text-indigo-600 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {lead.nextDate}
                                </div>
                              )}
                              <div className="text-xs text-slate-600 line-clamp-1">{lead.nextStep}</div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">未設定</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenModal(lead)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-xl transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(lead.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  {editingLead ? '案件を編集' : '新規案件を登録'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">必要な情報を入力してください。すべての項目は後で変更可能です。</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">基本情報</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">担当者名 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="田中 太郎 様"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">会社名 / 組織名</label>
                    <input 
                      type="text" 
                      placeholder="株式会社〇〇"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">メール</label>
                      <input 
                        type="email" 
                        placeholder="mail@example.com"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-xs transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">電話</label>
                      <input 
                        type="tel" 
                        placeholder="090-0000-0000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-xs transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Deal Detail Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">案件詳細</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">案件種別</label>
                      <select 
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-xs transition-all appearance-none"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                      >
                        {LEAD_TYPES.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">期待収益 (¥)</label>
                      <input 
                        type="number" 
                        placeholder="500,000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-xs transition-all"
                        value={formData.value}
                        onChange={(e) => setFormData({...formData, value: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">イベント名 / 研修コース名</label>
                    <input 
                      type="text" 
                      placeholder="2025年夏季カンファレンス 協賛..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">現在のステータス</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Next Action & Notes */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">次回フォローアップ</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                      value={formData.nextDate}
                      onChange={(e) => setFormData({...formData, nextDate: e.target.value})}
                    />
                    <textarea 
                      rows="2"
                      placeholder="次のアクション（例: 資料送付後の架電）"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-xs transition-all"
                      value={formData.nextStep}
                      onChange={(e) => setFormData({...formData, nextStep: e.target.value})}
                    ></textarea>
                  </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex items-center space-x-2 mb-2">
                    <Handshake className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">備考・メモ</h3>
                  </div>
                  <textarea 
                    rows="3"
                    placeholder="予算感、決裁フロー、重視しているポイントなど..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-xs transition-all"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm"
                >
                  閉じる
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all font-black text-sm active:scale-95"
                >
                  {editingLead ? '変更を保存する' : '案件を確定する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <footer className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="flex items-center justify-center space-x-2 text-slate-300 mb-2">
          <div className="h-px w-8 bg-slate-200"></div>
          <Target className="w-4 h-4 opacity-50" />
          <div className="h-px w-8 bg-slate-200"></div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">
          Business Continuity & Professional Relationship Management
        </p>
        <p className="text-[9px] text-slate-300 mt-2">
          Account ID: {user.uid}
        </p>
      </footer>
    </div>
  );
}