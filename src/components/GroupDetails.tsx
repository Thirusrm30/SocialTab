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
} from '@/services/firestore';
import type { Group, Expense, Settlement, JoinRequest } from '@/types';
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
    // Simple heuristic: "Title Amount" -> "Dinner 50"
    const words = text.split(' ');
    let amountIdx = -1;

    // Find last number
    for (let i = words.length - 1; i >= 0; i--) {
      // Remove symbols like $
      const cleanWord = words[i].replace(/[^0-9.]/g, '');
      if (cleanWord && !isNaN(parseFloat(cleanWord))) {
        amountIdx = i;
        break;
      }
    }

    // Category matching heuristic
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

    // Check if any word matches a category keyword
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
      // Fallback: just description
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

      // Simple heuristic to find total amount
      // Look for lines with "Total" or largest number
      const lines = text.split('\n');
      let maxAmount = 0;
      let foundTotal = false;

      // 1. Try to find "Total" line
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

      // 2. If no total, find largest number
      if (!foundTotal) {
        const allNumbers = text.match(/[0-9]+(\.[0-9]{2})?/g);
        if (allNumbers) {
          allNumbers.forEach(num => {
            const val = parseFloat(num);
            if (!isNaN(val) && val > maxAmount && val < 10000) { // Safety cap
              maxAmount = val;
            }
          });
          if (maxAmount > 0) {
            setExpenseAmount(maxAmount.toString());
          }
        }
      }

      // 3. Try to guess description (first line? or merchant name?)
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
      const [groupData, groupExpenses, groupSettlements] = await Promise.all([
        getGroupById(groupId),
        getGroupExpenses(groupId),
        getGroupSettlements(groupId),
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
        // Calculate the user's share of the new expense
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

  const balances = group ? calculateBalances(expenses, settlements, group.members) : new Map();
  const debts = getSimplifiedDebts(balances);

  // Analytics Data
  const categoryData = React.useMemo(() => {
    const data = CATEGORIES.map(cat => {
      const total = expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0);
      // Map Tailwind colors to Hex for Recharts
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
        name: member.displayName.split(' ')[0], // First name only for clearer charts
        amount: totalPaid,
        fill: '#8b5cf6' // Violet-500
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
      <div className={`w-8 h-8 rounded-full ${category.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${category.color}`} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 max-w-md mb-6">{error || "Group not found"}</p>
        <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 overflow-x-hidden">
        <header className="glass sticky top-0 z-10 border-b-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate('/')} className="-ml-4 text-white hover:bg-white/20 hover:text-white transition-all hover:-translate-x-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="text-center py-12 glass-card border-0 shadow-2xl">
            <CardContent>
              <Users className="w-16 h-16 text-purple-200 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
              <p className="text-gray-500 mb-6">{group.description}</p>
              <p className="text-sm text-gray-400 mb-6">
                {group.members.length} members · {group.isPublic ? 'Public' : 'Private'} group
              </p>
              {hasPendingRequest ? (
                <Badge variant="secondary" className="px-4 py-2">
                  <Clock className="w-4 h-4 mr-2" />
                  Join request pending
                </Badge>
              ) : (
                <Button onClick={handleJoinRequest} className="bg-gradient-to-r from-violet-600 to-indigo-600">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request to Join
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 pb-10">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/')} className="-ml-4 text-white hover:bg-white/20 hover:text-white transition-all hover:-translate-x-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {!isAdmin && (
              <Button variant="ghost" size="sm" onClick={handleLeaveGroup} className="text-red-200 hover:text-red-100 hover:bg-red-500/20 transition-all hover:scale-105">
                <LogOut className="w-4 h-4 mr-2" />
                Leave
              </Button>
            )}

          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{group.name}</h1>
            <p className="text-white/80 text-sm font-medium">{group.description}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4 p-1 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
            <TabsTrigger value="expenses" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white/90 bg-white/5 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all">Expenses</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white/90 bg-white/5 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all">Analytics</TabsTrigger>
            <TabsTrigger value="balances" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white/90 bg-white/5 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all">Balances</TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white/90 bg-white/5 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all">Members</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white/90 bg-white/5 hover:bg-white/20 text-xs sm:text-sm font-medium transition-all">History</TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Expenses</h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button size="sm" onClick={handleDeleteGroup} className="bg-white text-red-600 hover:bg-white/90 font-semibold shadow-lg">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Group
                  </Button>
                )}
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add Expense</DialogTitle>
                      <DialogDescription>Record a new shared expense</DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 mb-2 mt-4">
                      <Button
                        type="button"
                        variant={listening ? "destructive" : "outline"}
                        className="flex-1 border-dashed"
                        onClick={startListening}
                      >
                        {listening ? <MicOff className="w-4 h-4 mr-2 animate-pulse" /> : <Mic className="w-4 h-4 mr-2" />}
                        {listening ? 'Listening...' : 'Voice Input'}
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
                          className="w-full border-dashed"
                          disabled={processingReceipt}
                          onClick={() => document.getElementById('receipt-upload')?.click()}
                        >
                          {processingReceipt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                          {processingReceipt ? 'Scanning...' : 'Scan Receipt'}
                        </Button>
                      </div>
                    </div>

                    <form onSubmit={handleAddExpense}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                            <SelectTrigger>
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
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            placeholder="e.g., Dinner at restaurant"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Split Among</Label>
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
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                          className="w-full"
                        >
                          {addingExpense ? 'Adding...' : 'Add Expense'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {expenses.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white font-medium">No expenses yet</p>
                  <p className="text-sm text-white/70">Add your first expense to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="glass-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(expense.category)}
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-gray-500">
                              Paid by {expense.paidByName} · {expense.createdAt.toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Split among {expense.splitAmong.length} people
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                          {expense.paidBy === currentUser?.uid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 h-8 mt-1"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Visual Breakdown</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="glass-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Total Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(expenses.reduce((acc, curr) => acc + curr.amount, 0))}</div>
                  <p className="text-xs text-gray-400">Across {expenses.length} expenses</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Top Spender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{topSpender ? topSpender.name : '-'}</div>
                  {topSpender && <p className="text-xs text-green-400 font-medium">{formatCurrency(topSpender.amount)} paid</p>}
                </CardContent>
              </Card>
              <Card className="glass-card border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Top Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{topCategory ? topCategory.name : '-'}</div>
                  {topCategory && <p className="text-xs text-blue-400 font-medium">{formatCurrency(topCategory.value)} total</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-white">Spending by Category</CardTitle>
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
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 italic">No data to display</p>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-white">Member Spending</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {memberSpendingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={memberSpendingData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'white' }} axisLine={false} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none' }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                          {memberSpendingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 italic">No data to display</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Who Owes Whom</h2>

            {debts.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <Scale className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white font-medium">All settled up!</p>
                  <p className="text-sm text-white/70">Everyone has paid their share</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {debts.map((debt, index) => {
                  const fromMember = group.members.find((m) => m.uid === debt.from);
                  const toMember = group.members.find((m) => m.uid === debt.to);
                  const isCurrentUserDebt = debt.from === currentUser?.uid;

                  return (
                    <Card key={index} className={`${isCurrentUserDebt ? 'border-orange-300 bg-orange-50/90' : 'glass-card'} backdrop-blur-sm shadow-sm border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{fromMember?.displayName}</span>
                            <span className="text-gray-400">owes</span>
                            <span className="font-medium">{toMember?.displayName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">{formatCurrency(debt.amount)}</span>
                            {debt.from === currentUser?.uid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSettle(debt.from, debt.to, debt.amount)}
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
            <Card className="mt-6 glass-card border-0">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Individual Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.members.map((member) => {
                    const balance = balances.get(member.uid) || 0;
                    return (
                      <div key={member.uid} className="flex justify-between items-center">
                        <span className="text-sm">{member.displayName}</span>
                        <span
                          className={`text-sm font-medium ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
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
              <h2 className="text-lg font-semibold text-white">Members ({group.members.length})</h2>
            </div>

            <Card className="glass-card border-0">
              <CardContent className="p-0">
                {group.members.map((member, index) => (
                  <div key={member.uid}>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-medium">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.displayName}
                            {member.uid === currentUser?.uid && ' (You)'}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                    {index < group.members.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Join Requests (Admin Only) */}
            {isAdmin && group.joinRequests && group.joinRequests.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mt-6 text-white">Pending Requests</h3>
                <Card className="glass-card border-0">
                  <CardContent className="p-0">
                    {group.joinRequests.map((request, index) => (
                      <div key={request.uid}>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white font-medium">
                              {request.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{request.displayName}</p>
                              <p className="text-sm text-gray-500">{request.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(request)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {index < (group.joinRequests?.length || 0) - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Settlement History</h2>

            {settlements.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <History className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white font-medium">No settlements yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {settlements.map((settlement) => (
                  <Card key={settlement.id} className="bg-white/95 backdrop-blur-sm border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm">
                              {settlement.fromUserName} paid {settlement.toUserName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {settlement.settledAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">
                          {formatCurrency(settlement.amount)}
                        </span>
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
