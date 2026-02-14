import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { getAllUserExpenses } from '@/services/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowLeft,
    FileText,
    FileSpreadsheet,
    Loader2,
    Download,
    FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Expense } from '@/types';

interface ExpenseWithGroup extends Expense {
    groupName: string;
}

export function ExportReports() {
    const { currentUser } = useAuth();
    const { formatDate } = usePreferences();
    const navigate = useNavigate();

    const [exportingCSV, setExportingCSV] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [expenses, setExpenses] = useState<ExpenseWithGroup[] | null>(null);
    const [fetched, setFetched] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);

    async function fetchExpenses(): Promise<ExpenseWithGroup[]> {
        if (!currentUser) return [];
        if (expenses !== null) return expenses;

        setFetchLoading(true);
        try {
            const result = await getAllUserExpenses(currentUser.uid);
            setExpenses(result.expenses);
            setFetched(true);
            return result.expenses;
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to fetch expenses');
            return [];
        } finally {
            setFetchLoading(false);
        }
    }

    async function handleExportCSV() {
        setExportingCSV(true);
        try {
            const data = await fetchExpenses();

            if (data.length === 0) {
                toast.info('No expenses to export', {
                    description: 'Add some expenses first to generate a report.',
                });
                setExportingCSV(false);
                return;
            }

            const headers = ['Date', 'Description', 'Amount', 'Paid By', 'Group'];
            const rows = data.map((exp) => [
                formatDate(exp.createdAt),
                `"${exp.description.replace(/"/g, '""')}"`,
                exp.amount.toFixed(2),
                `"${exp.paidByName.replace(/"/g, '""')}"`,
                `"${exp.groupName.replace(/"/g, '""')}"`,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SocialTab_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('CSV exported successfully!');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            toast.error('Failed to export CSV');
        } finally {
            setExportingCSV(false);
        }
    }

    async function handleExportPDF() {
        setExportingPDF(true);
        try {
            const data = await fetchExpenses();

            if (data.length === 0) {
                toast.info('No expenses to export', {
                    description: 'Add some expenses first to generate a report.',
                });
                setExportingPDF(false);
                return;
            }

            const pdf = new jsPDF();
            const userName = currentUser?.displayName || currentUser?.email || 'User';
            const dateGenerated = formatDate(new Date());

            // ── Header ──
            pdf.setFontSize(22);
            pdf.setTextColor(124, 58, 237); // purple-600
            pdf.text('SocialTab', 14, 22);

            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128); // gray-500
            pdf.text('Expense Report', 14, 30);

            // ── User info ──
            pdf.setFontSize(11);
            pdf.setTextColor(31, 41, 55); // gray-800
            pdf.text(`User: ${userName}`, 14, 42);
            pdf.text(`Date Generated: ${dateGenerated}`, 14, 49);

            // Divider
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.line(14, 54, 196, 54);

            // ── Table ──
            const tableRows = data.map((exp) => [
                formatDate(exp.createdAt),
                exp.description,
                `$${exp.amount.toFixed(2)}`,
                exp.paidByName,
                exp.groupName,
            ]);

            autoTable(pdf, {
                startY: 60,
                head: [['Date', 'Description', 'Amount', 'Paid By', 'Group']],
                body: tableRows,
                styles: {
                    fontSize: 9,
                    cellPadding: 4,
                },
                headStyles: {
                    fillColor: [124, 58, 237],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [245, 243, 255],
                },
                margin: { left: 14, right: 14 },
            });

            // ── Total ──
            const totalAmount = data.reduce((sum, exp) => sum + exp.amount, 0);
            const finalY = (pdf as any).lastAutoTable?.finalY || 200;

            pdf.setFontSize(12);
            pdf.setTextColor(31, 41, 55);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Total: $${totalAmount.toFixed(2)}`, 14, finalY + 12);

            // ── Footer ──
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(156, 163, 175);
            pdf.text(
                `Generated by SocialTab on ${dateGenerated}`,
                14,
                pdf.internal.pageSize.height - 10
            );

            pdf.save(`SocialTab_Expenses_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('PDF exported successfully!');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            toast.error('Failed to export PDF');
        } finally {
            setExportingPDF(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500">
            {/* Header */}
            <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-10 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="text-white hover:bg-white/20 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg text-white">Export Reports</h1>
                        <p className="text-xs text-white/80">Download your expense data</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Intro card */}
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Download className="w-8 h-8 text-purple-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Export Your Expenses</h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Download all your expense data as a CSV spreadsheet or a beautifully formatted PDF report.
                        </p>
                    </CardContent>
                </Card>

                {/* Export Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CSV Export */}
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                                <FileSpreadsheet className="w-7 h-7 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">CSV File</h3>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                Spreadsheet format with Date, Description, Amount, Paid By, and Group columns.
                            </p>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 font-semibold shadow-md transition-all active:scale-95"
                                onClick={handleExportCSV}
                                disabled={exportingCSV || fetchLoading}
                            >
                                {exportingCSV ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                )}
                                {exportingCSV ? 'Exporting...' : 'Export as CSV'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* PDF Export */}
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                                <FileText className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">PDF Report</h3>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                Professional report with app branding, user info, expense table, and total amount.
                            </p>
                            <Button
                                className="w-full bg-red-600 hover:bg-red-700 font-semibold shadow-md transition-all active:scale-95"
                                onClick={handleExportPDF}
                                disabled={exportingPDF || fetchLoading}
                            >
                                {exportingPDF ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <FileText className="w-4 h-4 mr-2" />
                                )}
                                {exportingPDF ? 'Exporting...' : 'Export as PDF'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview / Stats */}
                {fetched && expenses !== null && (
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-5">
                            {expenses.length === 0 ? (
                                <div className="py-8 flex flex-col items-center text-center">
                                    <FileWarning className="w-10 h-10 text-gray-300 mb-3" />
                                    <p className="text-sm font-medium text-gray-500">No expenses found</p>
                                    <p className="text-xs text-gray-400 mt-1">Start adding expenses to generate reports.</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        Report Preview
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Expenses</p>
                                            <p className="text-lg font-bold text-gray-900">{expenses.length}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                                            <p className="text-lg font-bold text-purple-600">
                                                ${expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Groups</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {new Set(expenses.map((e) => e.groupId)).size}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Recent expenses preview */}
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {expenses.slice(0, 5).map((exp) => (
                                            <div key={exp.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-md">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                                                    <p className="text-xs text-gray-400">{formatDate(exp.createdAt)} · {exp.groupName}</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 ml-3">${exp.amount.toFixed(2)}</p>
                                            </div>
                                        ))}
                                        {expenses.length > 5 && (
                                            <p className="text-xs text-gray-400 text-center pt-1">
                                                +{expenses.length - 5} more expenses
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
