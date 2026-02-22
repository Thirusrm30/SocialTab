import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGroupById, getGroupExpenses, addPayment } from '@/services/firestore';
import type { Group, Expense } from '@/types';
import { ArrowLeft, CreditCard, Smartphone, Building, CheckCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function PaymentDashboard() {
    const { groupId, expenseId } = useParams<{ groupId: string; expenseId: string }>();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [group, setGroup] = useState<Group | null>(null);
    const [expense, setExpense] = useState<Expense | null>(null);
    const [userShare, setUserShare] = useState<number>(0);

    const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [transactionId, setTransactionId] = useState('');

    // Form Fields
    const [upiId, setUpiId] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [bankName, setBankName] = useState('');

    useEffect(() => {
        if (groupId && expenseId && currentUser) {
            loadData();
        }
    }, [groupId, expenseId, currentUser]);

    async function loadData() {
        setLoading(true);
        try {
            if (!groupId || !expenseId) return;
            const [grp, expenses] = await Promise.all([
                getGroupById(groupId),
                getGroupExpenses(groupId)
            ]);
            const exp = expenses.find(e => e.id === expenseId);
            setGroup(grp);
            if (exp && exp.splitAmong.length > 0) {
                setExpense(exp);
                setUserShare(exp.amount / exp.splitAmong.length);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expense || !group || !currentUser) return;

        // Prevent missing mock inputs constraint
        if (method === 'upi' && !upiId.trim()) return;
        if (method === 'card' && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim())) return;
        if (method === 'netbanking' && !bankName.trim()) return;

        setProcessing(true);

        // Simulate mock payment gateway delay
        setTimeout(async () => {
            const mockTxnId = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase();

            await addPayment({
                userId: currentUser.uid,
                paidToId: expense.paidBy,
                paidToName: expense.paidByName,
                expenseId: expense.id,
                groupId: group.id,
                amount: userShare,
                paymentMethod: method === 'upi' ? 'UPI' : method === 'card' ? 'Credit/Debit Card' : 'Net Banking',
                transactionId: mockTxnId,
                status: 'Success',
                expenseTitle: expense.description
            });

            setTransactionId(mockTxnId);
            setSuccess(true);
            setProcessing(false);
        }, 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen app-bg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2E8B8B]" />
            </div>
        );
    }

    if (!group || !expense) {
        return (
            <div className="min-h-screen app-bg flex flex-col items-center justify-center">
                <h2 className="text-xl font-bold text-[#1F3A5F]">Expense not found.</h2>
                <Button variant="link" onClick={() => navigate(`/group/${groupId}`)}>Go back to group</Button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen app-bg flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full st-card text-center p-6 animate-fade-up">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1F3A5F] mb-2">Payment Successful</h2>
                    <p className="text-[#6B7F99] mb-6">Your share of {expense.description} has been paid.</p>

                    <div className="bg-[#F7F9FB] rounded-xl p-4 text-left mb-6 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B7F99]">Transaction ID</span>
                            <span className="font-semibold text-[#1F3A5F]">{transactionId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B7F99]">Amount Paid</span>
                            <span className="font-semibold text-[#1F3A5F]">${userShare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B7F99]">Date & Time</span>
                            <span className="font-semibold text-[#1F3A5F]">{new Date().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#6B7F99]">Payment Method</span>
                            <span className="font-semibold text-[#1F3A5F]">
                                {method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : 'Net Banking'}
                            </span>
                        </div>
                    </div>

                    <Button
                        className="w-full h-11 rounded-xl shadow-soft font-semibold"
                        style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                        onClick={() => navigate(`/group/${groupId}`)}
                    >
                        Back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg">
            <header className="header-band sticky top-0 z-10 shadow-card">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/group/${groupId}`)}
                        className="-ml-4 text-white/80 hover:bg-white/10"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Cancel Payment
                    </Button>
                    <div className="mt-2 text-white">
                        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
                        <p className="opacity-80 text-sm">Testing Environment</p>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-8">
                <Card className="st-card mb-6 shadow-soft border border-[#E3EAF4]">
                    <CardHeader className="pb-3 border-b border-[#F0F4FB]">
                        <CardTitle className="text-sm font-semibold text-[#6B7F99] uppercase tracking-wider">Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-[#1F3A5F]">{expense.description}</span>
                            <span className="text-2xl font-bold text-[#2E8B8B]">${userShare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-[#6B7F99]">
                            <span>To: {expense.paidByName}</span>
                            <span>Group: <span className="font-medium text-[#1F3A5F]">{group.name}</span></span>
                        </div>
                    </CardContent>
                </Card>

                <form onSubmit={handlePay}>
                    <div className="space-y-4 mb-6">
                        <h3 className="font-bold text-[#1F3A5F] px-1">Choose Payment Method</h3>

                        <div className="grid grid-cols-3 gap-3">
                            <div
                                onClick={() => setMethod('upi')}
                                className={`cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center border-2 transition-all ${method === 'upi' ? 'border-[#2E8B8B] bg-[#2E8B8B]/5' : 'border-[#E3EAF4] bg-white hover:border-[#D3DFEE]'}`}
                            >
                                <Smartphone className={`w-6 h-6 mb-2 ${method === 'upi' ? 'text-[#2E8B8B]' : 'text-[#9DAEC5]'}`} />
                                <span className={`text-xs font-semibold ${method === 'upi' ? 'text-[#2E8B8B]' : 'text-[#6B7F99]'}`}>UPI</span>
                            </div>

                            <div
                                onClick={() => setMethod('card')}
                                className={`cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center border-2 transition-all ${method === 'card' ? 'border-[#2E8B8B] bg-[#2E8B8B]/5' : 'border-[#E3EAF4] bg-white hover:border-[#D3DFEE]'}`}
                            >
                                <CreditCard className={`w-6 h-6 mb-2 ${method === 'card' ? 'text-[#2E8B8B]' : 'text-[#9DAEC5]'}`} />
                                <span className={`text-xs font-semibold ${method === 'card' ? 'text-[#2E8B8B]' : 'text-[#6B7F99]'}`}>Card</span>
                            </div>

                            <div
                                onClick={() => setMethod('netbanking')}
                                className={`cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center border-2 transition-all ${method === 'netbanking' ? 'border-[#2E8B8B] bg-[#2E8B8B]/5' : 'border-[#E3EAF4] bg-white hover:border-[#D3DFEE]'}`}
                            >
                                <Building className={`w-6 h-6 mb-2 ${method === 'netbanking' ? 'text-[#2E8B8B]' : 'text-[#9DAEC5]'}`} />
                                <span className={`text-xs font-semibold ${method === 'netbanking' ? 'text-[#2E8B8B]' : 'text-[#6B7F99]'}`}>Banking</span>
                            </div>
                        </div>

                        <Card className="st-card shadow-soft p-5 border-[#E3EAF4]">
                            {method === 'upi' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <Label className="text-sm font-semibold text-[#1F3A5F]">UPI ID</Label>
                                    <Input
                                        placeholder="e.g. username@bank"
                                        value={upiId}
                                        onChange={e => setUpiId(e.target.value)}
                                        required
                                        className="rounded-xl h-11"
                                    />
                                </div>
                            )}

                            {method === 'card' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-[#1F3A5F]">Card Number</Label>
                                        <Input
                                            placeholder="0000 0000 0000 0000"
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value)}
                                            required
                                            className="rounded-xl h-11"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-[#1F3A5F]">Expiry</Label>
                                            <Input
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={e => setCardExpiry(e.target.value)}
                                                required
                                                className="rounded-xl h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-[#1F3A5F]">CVV</Label>
                                            <Input
                                                placeholder="123"
                                                type="password"
                                                value={cardCvv}
                                                onChange={e => setCardCvv(e.target.value)}
                                                required
                                                className="rounded-xl h-11"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {method === 'netbanking' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <Label className="text-sm font-semibold text-[#1F3A5F]">Select Bank</Label>
                                    <select
                                        className="flex h-11 w-full rounded-xl border border-[#E3EAF4] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E8B8B]/20 focus:border-[#2E8B8B]"
                                        value={bankName}
                                        onChange={e => setBankName(e.target.value)}
                                        required
                                    >
                                        <option value="">Select your bank</option>
                                        <option value="sbi">State Bank of India</option>
                                        <option value="hdfc">HDFC Bank</option>
                                        <option value="icici">ICICI Bank</option>
                                        <option value="axis">Axis Bank</option>
                                    </select>
                                </div>
                            )}
                        </Card>
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-full h-12 rounded-xl text-lg font-bold shadow-soft transition-transform active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #2E8B8B 0%, #3aacac 100%)' }}
                    >
                        {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {processing ? 'Processing...' : `Pay $${userShare.toFixed(2)}`}
                    </Button>

                    <p className="text-center text-xs text-[#9DAEC5] mt-4 flex justify-center items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Mock testing environment - no real money will be deducted.
                    </p>
                </form>
            </main>
        </div>
    );
}
