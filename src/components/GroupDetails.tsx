import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  getGroupById,
  getGroupExpenses,
  getGroupSettlements,
  addExpense,
  addSettlement,
  approveJoinRequest,
  rejectJoinRequest,
  sendJoinRequest,
  leaveGroup,
  deleteExpense,
  calculateBalances,
  getSimplifiedDebts,
  deleteGroup,
  getUserBudget,
  getUserTotalExpenses,
  getGroupPayments,
} from '@/services/firestore';
import type { Group, Expense, Settlement, JoinRequest, Payment } from '@/types';
import {
  ArrowLeft,
  Plus,
  Users,
  Check,
  X,
  LogOut,
  Trash2,
  Receipt,
  History,
  Scale,
  Loader2,
  UserPlus,
  Clock,
  Utensils,
  Car,
  Home,
  ShoppingCart,
  Zap,
  Film,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Heart,
  MoreHorizontal,
  AlertTriangle,
  Mic,
  MicOff,
  Image as ImageIcon,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-100' },
  { id: 'transport', name: 'Transportation', icon: Car, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'housing', name: 'Housing & Utilities', icon: Home, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingCart, color: 'text-pink-500', bg: 'bg-pink-100' },
  { id: 'utilities', name: 'Utilities', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'health', name: 'Health', icon: Heart, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 'education', name: 'Education', icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { id: 'work', name: 'Work', icon: Briefcase, color: 'text-gray-500', bg: 'bg-gray-100' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, color: 'text-cyan-500', bg: 'bg-cyan-100' },
  { id: 'other', name: 'Other', icon: MoreHorizontal, color: 'text-slate-500', bg: 'bg-slate-100' },
];

export function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expense dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('other');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);

  // Voice & OCR State
  const [processingReceipt, setProcessingReceipt] = useState(false);
  const [listening, setListening] = useState(false);

  // Voice Recognition Logic
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser does not support speech recognition. Please try Chrome.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      parseVoiceInput(transcript);
    };

    recognition.start();
  };

  const parseVoiceInput = (text: string) => {
    const words = text.split(' ');
    let amountIdx = -1;

    for (let i = words.length - 1; i >= 0; i--) {
      const cleanWord = words[i].replace(/[^0-9.]/g, '');
      if (cleanWord && !isNaN(parseFloat(cleanWord))) {
        amountIdx = i;
        break;
      }
    }

    const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
      food: ['food', 'meal', 'dinner', 'lunch', 'breakfast', 'snack', 'restaurant', 'cafe', 'groceries', 'coffee'],
      transport: ['taxi', 'uber', 'bus', 'train', 'flight', 'ticket', 'fuel', 'gas', 'car', 'parking'],
      housing: ['rent', 'utility', 'bill', 'house', 'maintenance'],
      shopping: ['shopping', 'clothes', 'buy', 'gift', 'mall'],
      entertainment: ['movie', 'cinema', 'game', 'concert', 'party', 'show'],
      health: ['doctor', 'medicine', 'hospital', 'gym', 'fitness', 'workout'],
      education: ['book', 'course', 'tuition', 'school', 'class'],
      work: ['office', 'software', 'laptop', 'work'],
      utilities: ['electric', 'water', 'internet', 'wifi', 'phone'],
    };

    let matchedCategory = 'other';
    const lowerText = text.toLowerCase();

    for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        matchedCategory = catId;
        break;
      }
    }

    if (amountIdx !== -1) {
      const amountStr = words[amountIdx].replace(/[^0-9.]/g, '');
      const description = words.slice(0, amountIdx).join(' ');

      setExpenseAmount(amountStr);
      setExpenseDescription(description.charAt(0).toUpperCase() + description.slice(1));
    } else {
      setExpenseDescription(text.charAt(0).toUpperCase() + text.slice(1));
    }

    setExpenseCategory(matchedCategory);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingReceipt(true);
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      await worker.terminate();

      console.log("OCR Text:", text);

      const lines = text.split('\n');
      let maxAmount = 0;
      let foundTotal = false;

      for (const line of lines) {
        if (line.toLowerCase().includes('total')) {
          const numbers = line.match(/[0-9]+(\.[0-9]{2})?/g);
          if (numbers) {
            const amount = parseFloat(numbers[numbers.length - 1]);
            if (!isNaN(amount)) {
              setExpenseAmount(amount.toString());
              foundTotal = true;
              break;
            }
          }
        }
      }

      if (!foundTotal) {
        const allNumbers = text.match(/[0-9]+(\.[0-9]{2})?/g);
        if (allNumbers) {
          allNumbers.forEach(num => {
            const val = parseFloat(num);
            if (!isNaN(val) && val > maxAmount && val < 10000) {
              maxAmount = val;
            }
          });
          if (maxAmount > 0) {
            setExpenseAmount(maxAmount.toString());
          }
        }
      }

      const description = lines[0]?.trim() || "Scanned Receipt";
      if (!expenseDescription) {
        setExpenseDescription(description.substring(0, 30));
      }

    } catch (err) {
      console.error("OCR Error:", err);
      alert("Failed to read receipt. Please try again or enter details manually.");
    } finally {
      setProcessingReceipt(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId, currentUser]);

  async function loadGroupData() {
    if (!groupId || !currentUser) return;

    setLoading(true);
    setError(null);
    try {
      const [groupData, groupExpenses, groupSettlements, groupPayments] = await Promise.all([
        getGroupById(groupId),
        getGroupExpenses(groupId),
        getGroupSettlements(groupId),
        getGroupPayments(groupId),
      ]);

      if (groupData) {
        setGroup(groupData);
        const member = groupData.members.find((m) => m.uid === currentUser.uid);
        setIsMember(!!member);
        setIsAdmin(member?.role === 'admin');
        setHasPendingRequest(
          groupData.joinRequests?.some((r) => r.uid === currentUser.uid) || false
        );
      } else {
        setError("Group not found. It may have been deleted or you don't have permission to view it.");
      }

      setExpenses(groupExpenses);
      setSettlements(groupSettlements);
      setPayments(groupPayments);
    } catch (err: any) {
      console.error('Error loading group data:', err);
      setError(err.message || "Failed to load group data. Please checking your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !currentUser || selectedMembers.length === 0) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;

    setAddingExpense(true);
    try {
      // Budget Validation
      const [budget, currentSpent] = await Promise.all([
        getUserBudget(currentUser.uid),
        getUserTotalExpenses(currentUser.uid),
      ]);

      if (budget !== null) {
        const isUserInSplit = selectedMembers.includes(currentUser.uid);
        if (isUserInSplit) {
          const userShare = amount / selectedMembers.length;
          if (currentSpent + userShare > budget) {
            alert(`Budget limit exceeded! Your current spending ($${currentSpent.toFixed(2)}) plus your share of this expense ($${userShare.toFixed(2)}) would exceed your monthly budget of $${budget.toFixed(2)}.`);
            setAddingExpense(false);
            return;
          }
        }
      }

      await addExpense(
        groupId,
        expenseDescription,
        amount,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        selectedMembers,
        currentUser.uid,
        expenseCategory
      );
      setExpenseDialogOpen(false);
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseCategory('other');
      setSelectedMembers([]);
      loadGroupData();
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setAddingExpense(false);
    }
  }

  async function handleSettle(fromUserId: string, toUserId: string, amount: number) {
    if (!groupId || !currentUser) return;

    try {
      const fromMember = group?.members.find((m) => m.uid === fromUserId);
      const toMember = group?.members.find((m) => m.uid === toUserId);

      await addSettlement(
        groupId,
        fromUserId,
        fromMember?.displayName || 'Anonymous',
        toUserId,
        toMember?.displayName || 'Anonymous',
        amount
      );
      loadGroupData();
    } catch (error) {
      console.error('Error adding settlement:', error);
    }
  }

  async function handleJoinRequest() {
    if (!groupId || !currentUser) return;

    try {
      await sendJoinRequest(
        groupId,
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || 'Anonymous'
      );
      loadGroupData();
    } catch (error) {
      console.error('Error sending join request:', error);
    }
  }

  async function handleApproveRequest(request: JoinRequest) {
    if (!groupId) return;

    try {
      await approveJoinRequest(groupId, request);
      loadGroupData();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  }

  async function handleRejectRequest(request: JoinRequest) {
    if (!groupId) return;

    try {
      await rejectJoinRequest(groupId, request);
      loadGroupData();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  }

  async function handleLeaveGroup() {
    if (!groupId || !currentUser || !group) return;

    const member = group.members.find((m) => m.uid === currentUser.uid);
    if (!member) return;

    try {
      await leaveGroup(groupId, member);
      navigate('/');
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await deleteExpense(expenseId);
      loadGroupData();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  }

  async function handleDeleteGroup() {
    if (!groupId || !group) return;
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone and will delete all expenses, settlements, and activity logs.')) return;

    try {
      setLoading(true);
      await deleteGroup(groupId);
      navigate('/');
    } catch (error) {
      console.error('Error deleting group:', error);
      setLoading(false);
    }
  }

  const balances = group ? calculateBalances(expenses, settlements, group.members, payments) : new Map();
  const debts = getSimplifiedDebts(balances);

  // Analytics Data
  const categoryData = React.useMemo(() => {
    const data = CATEGORIES.map(cat => {
      const total = expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0);
      const colorMap: { [key: string]: string } = {
        food: '#f97316', transport: '#3b82f6', housing: '#a855f7', shopping: '#ec4899',
        utilities: '#eab308', entertainment: '#ef4444', health: '#22c55e', education: '#6366f1',
        work: '#6b7280', fitness: '#06b6d4', other: '#64748b'
      };
      return {
        name: cat.name,
        value: total,
        fill: colorMap[cat.id] || '#cbd5e1'
      };
    }).filter(item => item.value > 0);

    const uncategorized = expenses.filter(e => !e.category).reduce((sum, e) => sum + e.amount, 0);
    if (uncategorized > 0) {
      data.push({ name: 'Uncategorized', value: uncategorized, fill: '#94a3b8' });
    }

    return data.sort((a, b) => b.value - a.value);
  }, [expenses]);

  const memberSpendingData = React.useMemo(() => {
    if (!group) return [];
    return group.members.map(member => {
      const totalPaid = expenses.filter(e => e.paidBy === member.uid).reduce((sum, e) => sum + e.amount, 0);
      return {
        name: member.displayName.split(' ')[0],
        amount: totalPaid,
        fill: '#2E8B8B'
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses, group]);

  const topSpender = memberSpendingData.length > 0 ? memberSpendingData[0] : null;
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryIcon = (categoryId?: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES.find(c => c.id === 'other')!;
    const Icon = category.icon;
    return (
      <div className={`w-9 h-9 rounded-xl ${category.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${category.color}`} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E8B8B]" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center app-bg">
        <div className="bg-red-50 p-4 rounded-2xl mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-[#1F3A5F] mb-2">Something went wrong</h2>
        <p className="text-[#6B7F99] max-w-md mb-6">{error || "Group not found"}</p>
        <Button
          onClick={() => navigate('/')}
          className="rounded-xl"
          style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
        >
          Return to dashboard
        </Button>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen app-bg">
        <header className="header-band sticky top-0 z-10 shadow-card">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="-ml-4 text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="text-center py-12 st-card animate-fade-up">
            <CardContent>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft"
                style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2E8B8B 100%)' }}
              >
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1F3A5F] mb-2">{group.name}</h2>
              <p className="text-[#6B7F99] mb-4">{group.description}</p>
              <p className="text-sm text-[#9DAEC5] mb-6">
                {group.members.length} members · {group.isPublic ? 'Public' : 'Private'} group
              </p>
              {hasPendingRequest ? (
                <Badge variant="secondary" className="px-4 py-2 bg-[#F4B860]/15 text-[#c47e1f] border-[#F4B860]/30">
                  <Clock className="w-4 h-4 mr-2" />
                  Join request pending
                </Badge>
              ) : (
                <Button
                  onClick={handleJoinRequest}
                  className="rounded-xl font-semibold shadow-soft"
                  style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request to join
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg pb-10">
      {/* Header */}
      <header className="header-band sticky top-0 z-10 shadow-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="-ml-4 text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {!isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveGroup}
                className="text-red-200 hover:text-red-100 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave
              </Button>
            )}
          </div>
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{group.name}</h1>
            <p className="text-white/80 text-sm font-medium">{group.description}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList
            className="grid w-full grid-cols-5 mb-4 p-1 rounded-xl border border-[#E3EAF4] shadow-soft"
            style={{ background: '#F0F4FB' }}
          >
            <TabsTrigger
              value="expenses"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] text-xs sm:text-sm font-medium transition-all"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] text-xs sm:text-sm font-medium transition-all"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="balances"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] text-xs sm:text-sm font-medium transition-all"
            >
              Balances
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] text-xs sm:text-sm font-medium transition-all"
            >
              Members
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] text-xs sm:text-sm font-medium transition-all"
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <h2 className="text-lg font-bold text-[#1F3A5F]">Expenses</h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteGroup}
                    className="text-red-600 border-red-200 hover:bg-red-50 font-semibold rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete group
                  </Button>
                )}
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-lg font-semibold shadow-soft"
                      style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-[#1F3A5F]">Add expense</DialogTitle>
                      <DialogDescription>Record a new shared expense</DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 mb-2 mt-4">
                      <Button
                        type="button"
                        variant={listening ? "destructive" : "outline"}
                        className="flex-1 border-dashed rounded-xl border-[#D3DFEE]"
                        onClick={startListening}
                      >
                        {listening ? <MicOff className="w-4 h-4 mr-2 animate-pulse" /> : <Mic className="w-4 h-4 mr-2" />}
                        {listening ? 'Listening...' : 'Voice input'}
                      </Button>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          id="receipt-upload"
                          className="hidden"
                          onChange={handleReceiptUpload}
                          disabled={processingReceipt}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed rounded-xl border-[#D3DFEE]"
                          disabled={processingReceipt}
                          onClick={() => document.getElementById('receipt-upload')?.click()}
                        >
                          {processingReceipt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                          {processingReceipt ? 'Scanning...' : 'Scan receipt'}
                        </Button>
                      </div>
                    </div>

                    <form onSubmit={handleAddExpense}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-[#2B2B2B]">Category</Label>
                          <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                            <SelectTrigger className="rounded-xl border-[#D3DFEE]">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <category.icon className="w-4 h-4" />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-[#2B2B2B]">Description</Label>
                          <Input
                            id="description"
                            placeholder="e.g., Dinner at restaurant"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            className="rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-[#2B2B2B]">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#2B2B2B]">Split among</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {group.members.map((member) => (
                              <div key={member.uid} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`member-${member.uid}`}
                                  checked={selectedMembers.includes(member.uid)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers([...selectedMembers, member.uid]);
                                    } else {
                                      setSelectedMembers(selectedMembers.filter((id) => id !== member.uid));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`member-${member.uid}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#2B2B2B]"
                                >
                                  {member.displayName}
                                  {member.uid === currentUser?.uid && ' (You)'}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={addingExpense || selectedMembers.length === 0}
                          className="w-full rounded-xl font-semibold h-11"
                          style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                        >
                          {addingExpense ? 'Adding...' : 'Add expense'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {expenses.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#1F3A5F] font-medium">No expenses yet</p>
                  <p className="text-sm text-[#6B7F99]">Add your first expense to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="st-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(expense.category)}
                          <div>
                            <p className="font-semibold text-[#1F3A5F]">{expense.description}</p>
                            <p className="text-sm text-[#6B7F99]">
                              Paid by {expense.paidByName} · {expense.createdAt.toLocaleDateString()}
                            </p>
                            <p className="text-xs text-[#9DAEC5] mt-1">
                              Split among {expense.splitAmong.length} people
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-[#1F3A5F]">{formatCurrency(expense.amount)}</p>
                          {expense.paidBy === currentUser?.uid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600 h-8 mt-1"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {expense.paidBy !== currentUser?.uid && expense.splitAmong.includes(currentUser?.uid ?? '') && (
                        <div className="mt-4 pt-3 border-t border-[#F0F4FB] flex justify-end">
                          {payments.some(p => p.expenseId === expense.id && p.userId === currentUser?.uid) ? (
                            <Badge variant="outline" className="text-sm font-semibold text-green-600 border-green-200 bg-green-50 px-3 py-1">
                              <Check className="w-4 h-4 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/group/${group.id}/pay/${expense.id}`)}
                              className="bg-[#2E8B8B] hover:bg-[#2E8B8B]/90 text-white font-medium shadow-soft rounded-lg px-6"
                            >
                              Pay Your Share
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-lg font-bold text-[#1F3A5F]">Visual breakdown</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="st-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#6B7F99]">Total spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#1F3A5F]">{formatCurrency(expenses.reduce((acc, curr) => acc + curr.amount, 0))}</div>
                  <p className="text-xs text-[#9DAEC5]">Across {expenses.length} expenses</p>
                </CardContent>
              </Card>
              <Card className="st-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#6B7F99]">Top spender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#1F3A5F]">{topSpender ? topSpender.name : '-'}</div>
                  {topSpender && <p className="text-xs text-[#2E8B8B] font-medium">{formatCurrency(topSpender.amount)} paid</p>}
                </CardContent>
              </Card>
              <Card className="st-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#6B7F99]">Top category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#1F3A5F]">{topCategory ? topCategory.name : '-'}</div>
                  {topCategory && <p className="text-xs text-[#2E8B8B] font-medium">{formatCurrency(topCategory.value)} total</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="st-card">
                <CardHeader>
                  <CardTitle className="text-[#1F3A5F]">Spending by category</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E3EAF4', boxShadow: '0 2px 12px rgba(31,58,95,0.08)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[#9DAEC5] italic">No data to display</p>
                  )}
                </CardContent>
              </Card>

              <Card className="st-card">
                <CardHeader>
                  <CardTitle className="text-[#1F3A5F]">Member spending</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {memberSpendingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={memberSpendingData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E3EAF4" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#1F3A5F', fontSize: 13 }} axisLine={false} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          cursor={{ fill: 'rgba(46,139,139,0.06)' }}
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E3EAF4', boxShadow: '0 2px 12px rgba(31,58,95,0.08)' }}
                        />
                        <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={32}>
                          {memberSpendingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[#9DAEC5] italic">No data to display</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-4">
            <h2 className="text-lg font-bold text-[#1F3A5F]">Who owes whom</h2>

            {debts.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <Scale className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#1F3A5F] font-medium">All settled up!</p>
                  <p className="text-sm text-[#6B7F99]">Everyone has paid their share</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {debts.map((debt, index) => {
                  const fromMember = group.members.find((m) => m.uid === debt.from);
                  const toMember = group.members.find((m) => m.uid === debt.to);
                  const isCurrentUserDebt = debt.from === currentUser?.uid;

                  return (
                    <Card key={index} className={`${isCurrentUserDebt ? 'border-amber-200 bg-amber-50/80' : 'st-card'} rounded-2xl shadow-soft`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1F3A5F]">{fromMember?.displayName}</span>
                            <span className="text-[#9DAEC5]">owes</span>
                            <span className="font-semibold text-[#1F3A5F]">{toMember?.displayName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-[#1F3A5F]">{formatCurrency(debt.amount)}</span>
                            {debt.from === currentUser?.uid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSettle(debt.from, debt.to, debt.amount)}
                                className="rounded-lg border-[#2E8B8B] text-[#2E8B8B] hover:bg-[#2E8B8B]/5"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Settle
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Individual Balances */}
            <Card className="mt-6 st-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#1F3A5F]">Individual balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.members.map((member) => {
                    const balance = balances.get(member.uid) || 0;
                    return (
                      <div key={member.uid} className="flex justify-between items-center">
                        <span className="text-sm text-[#2B2B2B]">{member.displayName}</span>
                        <span
                          className={`text-sm font-bold ${balance > 0 ? 'text-[#2E8B8B]' : balance < 0 ? 'text-red-500' : 'text-[#9DAEC5]'
                            }`}
                        >
                          {balance > 0 ? '+' : ''}
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1F3A5F]">Members ({group.members.length})</h2>
            </div>

            <Card className="st-card overflow-hidden">
              <CardContent className="p-0">
                {group.members.map((member, index) => (
                  <div key={member.uid}>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium shadow-soft"
                          style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2E8B8B 100%)' }}
                        >
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1F3A5F]">
                            {member.displayName}
                            {member.uid === currentUser?.uid && ' (You)'}
                          </p>
                          <p className="text-sm text-[#9DAEC5]">{member.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={member.role === 'admin' ? 'default' : 'secondary'}
                        className={member.role === 'admin' ? 'bg-[#1F3A5F] text-white' : 'bg-[#E3EAF4] text-[#6B7F99]'}
                      >
                        {member.role}
                      </Badge>
                    </div>
                    {index < group.members.length - 1 && <Separator className="bg-[#F0F4FB]" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Join Requests (Admin Only) */}
            {isAdmin && group.joinRequests && group.joinRequests.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-6 text-[#1F3A5F]">Pending requests</h3>
                <Card className="st-card overflow-hidden">
                  <CardContent className="p-0">
                    {group.joinRequests.map((request, index) => (
                      <div key={request.uid}>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium"
                              style={{ background: 'linear-gradient(135deg, #F4B860 0%, #e09830 100%)' }}
                            >
                              {request.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1F3A5F]">{request.displayName}</p>
                              <p className="text-sm text-[#9DAEC5]">{request.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(request)}
                              className="rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                              className="rounded-lg"
                              style={{ background: '#2E8B8B' }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {index < (group.joinRequests?.length || 0) - 1 && <Separator className="bg-[#F0F4FB]" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <h2 className="text-lg font-bold text-[#1F3A5F]">Payment history</h2>

            {payments.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <History className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#1F3A5F] font-medium">No payments yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="st-card shadow-soft rounded-2xl border border-[#E3EAF4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                            <Check className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[#1F3A5F]">
                              {payment.expenseTitle || 'Expense Payment'}
                            </p>
                            <p className="text-xs text-[#9DAEC5] flex items-center gap-1.5 mt-0.5">
                              {payment.timestamp.toLocaleString()} ·
                              <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-700 border-green-200 py-0 h-4 uppercase">
                                {payment.status}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-[#2E8B8B]">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-[#9DAEC5] tracking-wider mt-0.5">
                            {payment.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#F7F9FB] rounded-lg p-2.5 mt-2 flex justify-between text-xs">
                        <span className="text-[#6B7F99]">To: <span className="font-semibold text-[#1F3A5F]">{payment.paidToName}</span></span>
                        <span className="text-[#6B7F99]">Txn: <span className="font-medium">{payment.transactionId}</span></span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
