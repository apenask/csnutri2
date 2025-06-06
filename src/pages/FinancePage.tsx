import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Plus, Filter, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useAuth } from '../context/useAuth';
import { useSales } from '../context/useSales';
import { useExpenses } from '../context/ExpenseContext';
import { Expense } from '../types'; 

type CombinedTransaction = {
  id: string;
  type: 'income' | 'expense';
  transactionDate: string; 
  descriptionDisplay: string;
  amountDisplay: number;
  categoryDisplay: string; 
};

const FinancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const { sales, isLoading: isLoadingSales } = useSales();
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    updateExpense, 
    isLoading: isLoadingExpenses 
  } = useExpenses();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    description: '',
    amount: 0,
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    supplierId: undefined,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageMessage, setPageMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [showDeleteExpenseConfirmModal, setShowDeleteExpenseConfirmModal] = useState(false);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const formatDateRangeDisplay = (date: Date) => {
    return format(date, 'MMMM yyyy', { locale: ptBR });
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const { currentMonthSales, currentMonthExpenses, totalIncome, totalExpensesValue, balance } = useMemo(() => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    endDate.setHours(23,59,59,999);

    const cms = sales.filter(sale => {
      try { const saleDate = parseISO(sale.date); return saleDate >= startDate && saleDate <= endDate; } 
      catch { return false; }
    });
    
    const cme = expenses.filter(expense => {
      try { const expenseDate = parseISO(expense.date); return expenseDate >= startDate && expenseDate <= endDate; }
      catch { return false; }
    });
    
    const ti = cms.reduce((sum, sale) => sum + sale.total, 0);
    const tev = cme.reduce((sum, expense) => sum + expense.amount, 0);
    const b = ti - tev;

    return { currentMonthSales: cms, currentMonthExpenses: cme, totalIncome: ti, totalExpensesValue: tev, balance: b };
  }, [currentMonth, sales, expenses]);
  
  const expensesByCategoryChartData = useMemo(() => {
    const data = currentMonthExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [currentMonthExpenses]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E41E26', '#A259FF', '#FF5733'];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
  };
  
  const handleOpenAddModal = () => {
    setFormError('');
    setPageMessage(null);
    setCurrentExpense(null);
    setFormData({ description: '', amount: 0, category: '', date: format(new Date(), 'yyyy-MM-dd'), supplierId: undefined });
    setShowAddExpenseModal(true);
  }

  const handleOpenEditModal = (expense: Expense) => {
    setFormError('');
    setPageMessage(null);
    setCurrentExpense(expense);
    setFormData({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: format(parseISO(expense.date), 'yyyy-MM-dd'), 
        supplierId: expense.supplierId,
    });
    setShowEditExpenseModal(true);
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setPageMessage(null);
    if (!formData.description || formData.amount <= 0 || !formData.category || !formData.date) {
      setFormError("Todos os campos (Descrição, Valor > 0, Categoria, Data) são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    try {
      const expensePayload = {
        ...formData,
        date: format(parseISO(formData.date), 'yyyy-MM-dd'),
      };

      if (showEditExpenseModal && currentExpense) {
        await updateExpense(currentExpense.id, expensePayload);
        setShowEditExpenseModal(false);
        setPageMessage({ type: 'success', text: 'Despesa atualizada com sucesso!' });
      } else {
        await addExpense(expensePayload);
        setShowAddExpenseModal(false);
        setPageMessage({ type: 'success', text: 'Despesa adicionada com sucesso!' });
      }
      setFormData({ description: '', amount: 0, category: '', date: format(new Date(), 'yyyy-MM-dd'), supplierId: undefined });
      setCurrentExpense(null);
    } catch (err) {
      console.error("Erro ao salvar despesa:", err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar despesa.';
      setFormError(errorMessage);
      setPageMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteExpense = (id: string) => {
    setPageMessage(null);
    setExpenseIdToDelete(id);
    setShowDeleteExpenseConfirmModal(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseIdToDelete) return;
    setIsSubmitting(true);
    setPageMessage(null);
    try {
        await deleteExpense(expenseIdToDelete);
        setPageMessage({ type: 'success', text: 'Despesa excluída com sucesso!' });
    } catch (err) {
        console.error("Erro ao deletar despesa:", err);
        setPageMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao deletar despesa.' });
    } finally {
        setIsSubmitting(false);
        setShowDeleteExpenseConfirmModal(false);
        setExpenseIdToDelete(null);
    }
  }
  
  const formatCurrency = (value: number | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDateDisplay = (dateString: string | undefined) => {
    try {
        if(!dateString) return 'N/A';
        return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
        return dateString; 
    }
  }

  const combinedTransactions: CombinedTransaction[] = useMemo(() => {
    return [
      ...currentMonthSales.map(s => ({ 
          id: `sale-${s.id}`, 
          type: 'income' as const, 
          transactionDate: s.date, 
          descriptionDisplay: `Venda #${s.id.slice(-5)}`,
          amountDisplay: s.total,
          categoryDisplay: s.payments.map(p => p.method).join(', ') 
        })),
      ...currentMonthExpenses.map(e => ({ 
          id: `expense-${e.id}`, 
          type: 'expense' as const, 
          transactionDate: e.date, 
          descriptionDisplay: e.description,
          amountDisplay: e.amount,
          categoryDisplay: e.category
        }))
    ].sort((a, b) => parseISO(b.transactionDate).getTime() - parseISO(a.transactionDate).getTime());
  }, [currentMonthSales, currentMonthExpenses]);
  
  if (!isAdmin) { 
    return (
      <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h1>
          <p className="text-gray-500 dark:text-gray-400">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }
  if (isLoadingSales || isLoadingExpenses) { 
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando dados financeiros...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Financeiro</h1>
        <div className="flex space-x-2 mt-3 md:mt-0">
          <Button variant="outline" onClick={handleOpenAddModal} disabled={isSubmitting}>
            <Plus size={16} className="mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {pageMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ${pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {pageMessage.text}
        </div>
      )}
      
      <Card className="mb-6" transparentDarkBg={true}>
        <div className="flex justify-between items-center p-3 sm:p-4">
            <Button variant="outline" size="sm" onClick={() => changeMonth('prev')} aria-label="Mês anterior" disabled={isSubmitting}>
              <ChevronLeft size={20} />
            </Button>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 capitalize">
              {formatDateRangeDisplay(currentMonth)}
            </h2>
            <Button variant="outline" size="sm" onClick={() => changeMonth('next')} aria-label="Próximo mês" disabled={isSubmitting}>
              <ChevronRight size={20} />
            </Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card noPadding>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-500/20">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receitas ({formatDateRangeDisplay(currentMonth)})</p>
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>
        </Card>
        <Card noPadding>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-500/20">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas ({formatDateRangeDisplay(currentMonth)})</p>
                <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{formatCurrency(totalExpensesValue)}</p>
              </div>
            </div>
          </div>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1" noPadding>
          <div className="p-4">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'}`}>
                <DollarSign className={`h-6 w-6 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo ({formatDateRangeDisplay(currentMonth)})</p>
                <p className={`text-2xl font-semibold ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <Card title="Despesas por Categoria">
          <div className="h-80 p-4">
            {expensesByCategoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensesByCategoryChartData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" labelLine={false} label={({ name, percent, value }) => `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}>
                    {expensesByCategoryChartData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} wrapperClassName="!bg-white dark:!bg-gray-700 !border-gray-300 dark:!border-gray-600 rounded shadow-lg"/>
                  <Legend formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Sem despesas para exibir no gráfico.</div>)}
          </div>
        </Card>
        
        <Card title="Últimas Transações do Mês" noPadding>
          <div className="overflow-y-auto max-h-80">
            {combinedTransactions.length > 0 ? (
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {combinedTransactions.slice(0, 10).map((transaction: CombinedTransaction) => (
                            <tr key={transaction.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDateDisplay(transaction.transactionDate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 max-w-xs truncate" title={transaction.descriptionDisplay}>{transaction.descriptionDisplay}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amountDisplay)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : ( <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 py-10">Nenhuma transação neste mês.</div> )}
          </div>
        </Card>
      </div>
      
      <Card 
        title="Detalhamento de Despesas do Mês" 
        headerAction={ <Button variant="outline" size="sm" onClick={() => setPageMessage({type: 'error', text:'Funcionalidade de filtro a ser implementada.'})} disabled={isSubmitting}> <Filter size={16} className="mr-1" /> Filtrar </Button> }
        noPadding 
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentMonthExpenses.length > 0 ? (
                currentMonthExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDateDisplay(expense.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={expense.description}>{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">{expense.category}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(expense)} className="mr-2" disabled={isSubmitting}><Edit size={14}/></Button>
                        <Button variant="danger" size="sm" onClick={() => requestDeleteExpense(expense.id)} disabled={isSubmitting}><Trash2 size={14}/></Button>
                    </td>
                  </tr>
                ))
              ) : (<tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Nenhuma despesa para exibir neste mês.</td></tr>)}
            </tbody>
            {currentMonthExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">Total de Despesas do Mês</td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpensesValue)}</td>
                  <td className="px-6 py-3"></td> 
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      
      {(showAddExpenseModal || showEditExpenseModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-black dark:bg-opacity-75" onClick={() => {if(!isSubmitting) {setShowAddExpenseModal(false); setShowEditExpenseModal(false); setFormError('');}}}></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <form onSubmit={handleFormSubmit} className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
                    {showEditExpenseModal ? 'Editar Despesa' : 'Nova Despesa'}
                  </h3>
                  {formError && <p className="text-red-600 dark:text-red-400 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>}
                  <div className="space-y-4">
                    <Input label="Descrição" type="text" name="description" required value={formData.description} onChange={handleInputChange} fullWidth/>
                    <Input label="Valor (R$)" type="number" name="amount" min="0.01" step="0.01" required value={String(formData.amount)} onChange={handleInputChange} fullWidth/>
                    <Input label="Data" type="date" name="date" required value={formData.date} onChange={handleInputChange} fullWidth/>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                      <select id="category" name="category" required value={formData.category} onChange={handleInputChange} 
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm">
                        <option value="">Selecione uma categoria</option>
                        <option value="Aluguel">Aluguel</option>
                        <option value="Contas Fixas">Contas Fixas (Água, Luz, Internet)</option>
                        <option value="Fornecedores">Fornecedores / Estoque</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Salários">Salários / Pró-labore</option>
                        <option value="Impostos">Impostos</option>
                        <option value="Material de Escritório">Material de Escritório</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Outras">Outras Despesas</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                    {showEditExpenseModal ? 'Salvar Alterações' : 'Adicionar Despesa'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {if(!isSubmitting) {setShowAddExpenseModal(false); setShowEditExpenseModal(false); setFormError('');}}} disabled={isSubmitting} className="mt-3 sm:mt-0 sm:ml-3">
                    Cancelar
                  </Button>
                </div>
              </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteExpenseConfirmModal}
        onClose={() => {
            if(!isSubmitting) {
                setShowDeleteExpenseConfirmModal(false);
                setExpenseIdToDelete(null);
            }
        }}
        onConfirm={confirmDeleteExpense}
        title="Confirmar Exclusão de Despesa"
        message="Tem certeza que deseja excluir esta despesa? Esta ação não poderá ser desfeita."
        confirmButtonText="Excluir Despesa"
        confirmButtonVariant="danger"
        icon={Trash2}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default FinancePage;
