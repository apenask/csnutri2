import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, BarChart2, Users, PackageSearch, PieChart as PieChartIcon, TrendingUp, TrendingDown, Calendar, DollarSign, FileSpreadsheet } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useSales } from '../context/SaleContext';
import { useProducts } from '../context/ProductContext';
import { useCustomers } from '../context/CustomerContext';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { Customer, Sale, Expense, Product as ProductType } from '../types';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importação padrão do jspdf-autotable

// Não precisamos mais da interface jsPDFWithAutoTable se chamarmos autoTable como uma função separada.

type CustomerReportData = Customer & {
  salesCount: number; 
  averagePerSale: number; 
  totalSpentInPeriod?: number; 
  salesCountInPeriod?: number; 
  averagePerSaleInPeriod?: number; 
};

type DetailedReportTransaction = {
  id: string;
  date: string; 
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number; 
};

const ReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const { sales, isLoading: isLoadingSales } = useSales();
  const { products, isLoading: isLoadingProducts, getProductById } = useProducts();
  const { customers, getCustomerById, isLoading: isLoadingCustomers } = useCustomers();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();

  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customers' | 'finance'>('sales');
  const [pageMessage, setPageMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingCustomers || isLoadingExpenses;

  const formatDateDisplay = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try { return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR }); } 
    catch (e) { 
      return dateString; 
    }
  };
  
  const formatCurrency = (value: number | undefined): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filteredSales: Sale[] = useMemo(() => {
    if (isLoadingSales || !dateRange.start || !dateRange.end) return [];
    try {
        const start = parseISO(dateRange.start);
        const end = parseISO(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return sales.filter(sale => {
          try { const saleDate = parseISO(sale.date); return saleDate >= start && saleDate <= end; } 
          catch { return false; }
        });
    } catch { return []; }
  }, [dateRange.start, dateRange.end, sales, isLoadingSales]);

  const filteredExpenses: Expense[] = useMemo(() => {
    if (isLoadingExpenses || !dateRange.start || !dateRange.end) return [];
    try {
        const start = parseISO(dateRange.start);
        const end = parseISO(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return expenses.filter(expense => {
          try { const expenseDate = parseISO(expense.date); return expenseDate >= start && expenseDate <= end; } 
          catch { return false; }
        });
    } catch { return []; }
  }, [dateRange.start, dateRange.end, expenses, isLoadingExpenses]);

  const salesChartData = useMemo(() => { 
    if (!filteredSales.length) return [];
    const salesByDay = filteredSales.reduce<Record<string, number>>((acc, sale) => {
      const day = sale.date; 
      acc[day] = (acc[day] || 0) + sale.total;
      return acc;
    }, {});
    return Object.entries(salesByDay)
      .map(([date, totalSales]) => ({ date: formatDateDisplay(date), originalDate: date, sales: totalSales }))
      .sort((a, b) => parseISO(a.originalDate).getTime() - parseISO(b.originalDate).getTime());
  }, [filteredSales]); 
  
  const productSalesData = useMemo(() => { 
    if (!filteredSales.length || isLoadingProducts) return [];
    const salesByProductRec: Record<string, {name: string, quantity: number, total: number}> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const productInfo = getProductById(item.productId);
        if (productInfo) {
          if (!salesByProductRec[productInfo.id]) salesByProductRec[productInfo.id] = { name: productInfo.name, quantity: 0, total: 0 };
          salesByProductRec[productInfo.id].quantity += item.quantity;
          salesByProductRec[productInfo.id].total += item.subtotal;
        }
      });
    });
    return Object.values(salesByProductRec).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredSales, getProductById, isLoadingProducts]);

  const customerReportTableData: CustomerReportData[] = useMemo(() => { 
    if (isLoadingCustomers) return [];
    return customers.map(customer => {
      const customerSalesInPeriod = filteredSales.filter(s => s.customerId === customer.id);
      const totalSpentInPeriod = customerSalesInPeriod.reduce((sum, sale) => sum + sale.total, 0);
      const salesCountInPeriod = customerSalesInPeriod.length;
      const averagePerSaleInPeriod = salesCountInPeriod > 0 ? totalSpentInPeriod / salesCountInPeriod : 0;

      return { 
        ...customer, 
        salesCount: customer.totalPurchases || 0,
        totalSpent: customer.totalSpent || 0,    
        averagePerSale: (customer.totalPurchases || 0) > 0 ? (customer.totalSpent || 0) / (customer.totalPurchases || 0) : 0,
        totalSpentInPeriod,
        salesCountInPeriod,
        averagePerSaleInPeriod,
      };
    }).sort((a, b) => (b.totalSpentInPeriod || 0) - (a.totalSpentInPeriod || 0));
  }, [customers, isLoadingCustomers, filteredSales]);

  const expensesByCategoryChartData = useMemo(() => { 
    if (!filteredExpenses.length) return [];
    const data = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(data).map(([category, amount]) => ({ category, amount }));
  }, [filteredExpenses]);

  const detailedFinancialTransactions: DetailedReportTransaction[] = useMemo(() => {
    return [
      ...filteredSales.map((sale: Sale) => ({
        id: `sale-${sale.id}`, date: sale.date, description: `Venda #${sale.id.slice(-5)}`,
        category: sale.payments.map(p=>p.method.charAt(0).toUpperCase() + p.method.slice(1)).join(', '),
        type: 'income' as const, amount: sale.total 
      })),
      ...filteredExpenses.map((expense: Expense) => ({
        id: `expense-${expense.id}`, date: expense.date, description: expense.description,
        category: expense.category, type: 'expense' as const, amount: expense.amount 
      }))
    ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [filteredSales, filteredExpenses]);
  
  const totalIncome = useMemo(() => filteredSales.reduce((sum, sale: Sale) => sum + sale.total, 0), [filteredSales]);
  const totalExpensesValue = useMemo(() => filteredExpenses.reduce((sum, expense: Expense) => sum + expense.amount, 0), [filteredExpenses]);
  const balance = useMemo(() => totalIncome - totalExpensesValue, [totalIncome, totalExpensesValue]);

  const generatePDFReport = () => {
    setPageMessage(null);
    console.log('[generatePDFReport] Iniciando geração de PDF...');
    try {
      const doc = new jsPDF();
      console.log('[generatePDFReport] Instância jsPDF criada.');
      
      // Verifica se autoTable (importado) é uma função
      if (typeof autoTable !== 'function') {
        console.error('[generatePDFReport] ERRO CRÍTICO: A importação de `jspdf-autotable` não resultou em uma função.');
        throw new Error('O plugin jspdf-autotable não foi carregado corretamente como uma função.');
      }
      console.log('[generatePDFReport] `autoTable` importado é uma função.');

      const reportTitleText = `Relatório de ${ reportType === 'sales' ? 'Vendas' : reportType === 'inventory' ? 'Estoque' : reportType === 'customers' ? 'Clientes' : 'Financeiro' }`;
      const periodText = `Período: ${formatDateDisplay(dateRange.start)} a ${formatDateDisplay(dateRange.end)}`;
      const generatedAtText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', {locale: ptBR})}`;
      const csNutriRed: [number, number, number] = [228, 30, 38]; 

      doc.setFontSize(18); 
      doc.text(reportTitleText, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' }); 
      doc.setFontSize(10); 
      doc.text(periodText, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
      doc.text(generatedAtText, doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });
      
      let startY = 45;

      if (reportType === 'sales') {
        autoTable(doc, { // Chamada direta da função importada
          startY,
          head: [['Data', 'Cliente', 'Itens', 'Pagamento', 'Total']],
          body: filteredSales.map(sale => [
            formatDateDisplay(sale.date),
            getCustomerById(sale.customerId || '')?.name || 'N/A',
            sale.items.length.toString(), 
            sale.payments.map(p => p.method.charAt(0).toUpperCase() + p.method.slice(1)).join(', '),
            formatCurrency(sale.total)
          ]),
          foot: [['', '', '', 'Total de Vendas no Período', formatCurrency(totalIncome)]],
          theme: 'striped',
          headStyles: { fillColor: csNutriRed }, 
        });
      } else if (reportType === 'inventory') {
        autoTable(doc, {
          startY,
          head: [['Produto', 'Categoria', 'Estoque Atual', 'Est. Mínimo', 'Custo Unit.', 'Preço Venda', 'Valor Total (Custo)']],
          body: products.map(product => [
            product.name,
            product.customCategory || product.category,
            product.stock.toString(), 
            product.minStock.toString(), 
            formatCurrency(product.cost),
            formatCurrency(product.price),
            formatCurrency(product.stock * product.cost)
          ]),
          foot: [['', '', '', '', '', 'Valor Total em Estoque', formatCurrency(
            products.reduce((sum, product) => sum + (product.stock * product.cost), 0)
          )]],
          theme: 'striped',
          headStyles: { fillColor: csNutriRed },
        });
      } else if (reportType === 'customers') {
        autoTable(doc, {
          startY,
          head: [['Cliente', 'Telefone', 'Email', 'Compras (Período)', 'Gasto (Período)', 'Ticket Médio (Período)']],
          body: customerReportTableData.map(customer => [
            customer.name,
            customer.phone,
            customer.email || 'N/A',
            (customer.salesCountInPeriod || 0).toString(), 
            formatCurrency(customer.totalSpentInPeriod), 
            formatCurrency(customer.averagePerSaleInPeriod) 
          ]),
          theme: 'striped',
          headStyles: { fillColor: csNutriRed },
        });
      } else if (reportType === 'finance') {
        doc.setFontSize(12);
        doc.text('Resumo Financeiro do Período', 14, startY);
        startY += 10;
        doc.setFontSize(10);
        doc.text(`Receitas (Vendas no período): ${formatCurrency(totalIncome)}`, 14, startY);
        startY += 7;
        doc.text(`Despesas (no período): ${formatCurrency(totalExpensesValue)}`, 14, startY);
        startY += 7;
        doc.text(`Saldo (no período): ${formatCurrency(balance)}`, 14, startY);
        startY += 10; 

        autoTable(doc, {
          startY,
          head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
          body: detailedFinancialTransactions.map(transaction => [
            formatDateDisplay(transaction.date),
            transaction.description,
            transaction.category,
            transaction.type === 'income' ? 'Receita' : 'Despesa',
            (transaction.type === 'income' ? '+' : '') + formatCurrency(transaction.amount) 
          ]),
          theme: 'striped',
          headStyles: { fillColor: csNutriRed },
        });
      }
      doc.save(`relatorio_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      setPageMessage({type: 'success', text: 'Relatório PDF gerado com sucesso!'});
    } catch (error) {
      console.error("Erro detalhado ao gerar PDF:", error); 
      setPageMessage({type: 'error', text: `Falha ao gerar relatório PDF. Detalhes: ${error instanceof Error ? error.message : String(error)}`});
    }
  };

  const generateCSVReport = () => {
    setPageMessage({type: 'error', text: 'Exportação para CSV/Planilha ainda não implementada.'});
    console.log("Gerar CSV - funcionalidade futura");
  };


  if (!isAdmin) { return ( <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-900"><div className="text-center"><h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h1><p className="text-gray-500 dark:text-gray-400">Você não tem permissão.</p></div></div> ); }
  if (isLoading) { return ( <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div><p className="ml-4 text-gray-700 dark:text-gray-300">Carregando relatórios...</p></div> ); }

  const reportTypes = [
    { key: 'sales' as const, label: 'Vendas', icon: BarChart2 },
    { key: 'inventory' as const, label: 'Estoque', icon: PackageSearch },
    { key: 'customers' as const, label: 'Clientes', icon: Users },
    { key: 'finance' as const, label: 'Financeiro', icon: PieChartIcon },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E41E26', '#A259FF', '#FF5733'];

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <div className="flex gap-2">
          <Button onClick={generatePDFReport} disabled={isLoading}>
            <Download size={16} className="mr-2" /> Exportar PDF
          </Button>
          <Button onClick={generateCSVReport} disabled={true} variant="outline" title="Funcionalidade em breve">
            <FileSpreadsheet size={16} className="mr-2" /> Exportar Planilha (Em breve)
          </Button>
        </div>
      </div>

      {pageMessage && (
        <div className={`mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ${pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {pageMessage.text}
        </div>
      )}
      
      <Card className="mb-6" transparentDarkBg={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Relatório</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map(rt => (
                <Button
                  key={rt.key} 
                  onClick={() => setReportType(rt.key)}
                  variant={reportType === rt.key ? 'primary' : 'outline'}
                  className={`flex items-center justify-center py-2 px-3 text-sm ${reportType !== rt.key ? 'dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700' : '' }`}
                >
                  <rt.icon size={16} className="mr-2 flex-shrink-0" />
                  {rt.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input type="date" id="start-date" value={dateRange.start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange({ ...dateRange, start: e.target.value })} />
              </div>
              <div>
                <Input type="date" id="end-date" value={dateRange.end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange({ ...dateRange, end: e.target.value })}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                {[ { label: "Últ. 7 dias", days: 7 }, { label: "Últ. 30 dias", days: 30 }, { label: "Últ. 365 dias", days: 365 } ].map(period => ( <Button key={period.label} variant='outline' size='sm' onClick={() => { const today = new Date(); setDateRange({ start: format(subDays(today, period.days -1), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }); }} className="text-xs dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700" > {period.label} </Button> ))}
            </div>
          </div>
        </div>
      </Card>
      
      <div className="space-y-6">
        {reportType === 'sales' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-red-100 dark:bg-red-500/20"><BarChart2 size={20} className="text-red-600 dark:text-red-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total de Vendas</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalIncome)}</p></div></div></div></Card>
              <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-blue-100 dark:bg-blue-500/20"> <Calendar size={20} className="text-blue-600 dark:text-blue-300" /> </div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Qtd. de Vendas</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{filteredSales.length}</p></div></div></div></Card>
              <Card noPadding className="sm:col-span-2 lg:col-span-1"><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-green-100 dark:bg-green-500/20"><DollarSign size={20} className="text-green-600 dark:text-green-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Ticket Médio</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{filteredSales.length > 0 ? formatCurrency(totalIncome / filteredSales.length) : formatCurrency(0)}</p></div></div></div></Card>
            </div>
            <Card title="Vendas no Período" noPadding>
              <div className="h-80 p-4">
                {salesChartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={salesChartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700"/><XAxis dataKey="date" tick={{fontSize: 10, fill: 'currentColor'}} className="text-gray-600 dark:text-gray-400"/><YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{fontSize: 10, fill: 'currentColor'}} className="text-gray-600 dark:text-gray-400"/><Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', borderColor: '#e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} wrapperClassName="!text-sm dark:![&_.recharts-tooltip-item]:!text-gray-700" formatter={(value: number) => [formatCurrency(Number(value)), 'Vendas']} /><Line type="monotone" dataKey="sales" stroke="#E41E26" strokeWidth={2} activeDot={{ r: 6, fill: '#E41E26', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 2 }} dot={{r:3, fill: '#E41E26'}}/></LineChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma venda no período.</div>)}
              </div>
            </Card>
            <Card title="Produtos Mais Vendidos (Top 10)" noPadding>
              <div className="h-96 p-4">
                {productSalesData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={productSalesData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" /><XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} tick={{fontSize: 10, fill: 'currentColor'}} className="text-gray-600 dark:text-gray-400" /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, width: 140, fill: 'currentColor' }} width={150} interval={0} className="text-gray-600 dark:text-gray-400 truncate" /><Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', borderColor: '#e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }} wrapperClassName="!text-sm dark:![&_.recharts-tooltip-item]:!text-gray-700" formatter={(value: number) => [formatCurrency(Number(value)), 'Total']} /><Bar dataKey="total" fill="#E41E26" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma venda para listar produtos.</div>)}
              </div>
            </Card>
            <Card title="Detalhamento de Vendas" noPadding>
              <div className="overflow-x-auto">
                <table className="min-w-full"><thead className="bg-gray-100 dark:bg-gray-700/60"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Data</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cliente</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Itens</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Pagamento</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total</th></tr></thead><tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{filteredSales.length > 0 ? (filteredSales.map((sale: Sale) => { const customer = getCustomerById(sale.customerId || ''); const paymentMethodDisplay = sale.payments && sale.payments.length > 0 ? sale.payments[0].method : 'N/A'; return (<tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40"><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDateDisplay(sale.date)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{customer ? customer.name : 'Cliente não informado'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}</td><td className="px-6 py-4 whitespace-nowrap text-sm hidden sm:table-cell"><span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${ paymentMethodDisplay === 'pix' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-700/30 dark:text-cyan-300' : paymentMethodDisplay === 'credit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-300' :  paymentMethodDisplay === 'debit' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700/30 dark:text-indigo-300' :'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300' }`}>{paymentMethodDisplay.charAt(0).toUpperCase() + paymentMethodDisplay.slice(1)}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-800 dark:text-gray-100">{formatCurrency(sale.total)}</td></tr> );}) ) : ( <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Nenhuma venda no período.</td></tr> )}</tbody>{filteredSales.length > 0 && ( <tfoot><tr className="bg-gray-100 dark:bg-gray-700/60"><td colSpan={4} className="px-6 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Total</td><td className="px-6 py-3 text-right text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalIncome)}</td></tr></tfoot> )}</table>
              </div>
            </Card>
          </>
        )}
        
        {reportType === 'inventory' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-red-100 dark:bg-red-500/20"><PackageSearch size={20} className="text-red-600 dark:text-red-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total de Produtos</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{products.length}</p></div></div></div></Card>
                <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-500/20"><PackageSearch size={20} className="text-yellow-600 dark:text-yellow-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Estoque Baixo</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{products.filter(p => p.stock <= p.minStock).length}</p></div></div></div></Card>
                <Card noPadding className="sm:col-span-2 lg:col-span-1"><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-green-100 dark:bg-green-500/20"><DollarSign size={20} className="text-green-600 dark:text-green-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Valor em Estoque (Custo)</p><p className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(products.reduce((sum, p) => sum + (p.cost * p.stock), 0))}</p></div></div></div></Card>
            </div>
            <Card title="Relatório de Estoque" noPadding>
              <div className="overflow-x-auto">
                <table className="min-w-full"><thead className="bg-gray-100 dark:bg-gray-700/60"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Produto</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Categoria</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Preço</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Custo</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Estoque</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Est. Mínimo</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Valor Total (Custo)</th></tr></thead><tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{products.map((product: ProductType) => (<tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40"><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{product.customCategory || product.category}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-800 dark:text-gray-200">{formatCurrency(product.price)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-800 dark:text-gray-200 hidden sm:table-cell">{formatCurrency(product.cost)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-right"><span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock <= product.minStock ? 'bg-red-100 text-red-800 dark:bg-red-500/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-500/30 dark:text-green-300'}`}>{product.stock}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">{product.minStock}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-800 dark:text-gray-100 hidden md:table-cell">{formatCurrency(product.cost * product.stock)}</td></tr>))}</tbody><tfoot><tr className="bg-gray-100 dark:bg-gray-700/60"><td colSpan={6} className="px-6 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Valor Total em Estoque (Custo)</td><td className="px-6 py-3 text-right text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrency(products.reduce((sum, p) => sum + (p.cost * p.stock), 0))}</td></tr></tfoot></table>
              </div>
            </Card>
          </>
        )}
        
        {reportType === 'customers' && (
          <Card title="Relatório de Clientes" noPadding>
            <div className="overflow-x-auto">
                <table className="min-w-full"><thead className="bg-gray-100 dark:bg-gray-700/60"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cliente</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Contato</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Compras (Período)</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Gasto (Período)</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Ticket Médio (Período)</th></tr></thead><tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{customerReportTableData.map((customer: CustomerReportData) => (<tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40"><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>{customer.address && <div className="text-xs text-gray-500 dark:text-gray-400">{customer.address}</div>}</td><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-800 dark:text-gray-200">{customer.phone}</div>{customer.email && <div className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</div>}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-300">{customer.salesCountInPeriod || 0}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-800 dark:text-gray-100">{formatCurrency(customer.totalSpentInPeriod)}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-800 dark:text-gray-100 hidden sm:table-cell">{formatCurrency(customer.averagePerSaleInPeriod)}</td></tr>))}</tbody></table>
            </div>
          </Card>
        )}
        
        {reportType === 'finance' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-green-100 dark:bg-green-500/20"><TrendingUp size={20} className="text-green-600 dark:text-green-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Receitas</p><p className="text-xl sm:text-2xl font-semibold text-green-700 dark:text-green-300">{formatCurrency(totalIncome)}</p></div></div></div></Card>
                <Card noPadding><div className="p-4"><div className="flex items-center"><div className="p-3 rounded-full bg-red-100 dark:bg-red-500/20"><TrendingDown size={20} className="text-red-600 dark:text-red-300" /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Despesas</p><p className="text-xl sm:text-2xl font-semibold text-red-700 dark:text-red-400">{formatCurrency(totalExpensesValue)}</p></div></div></div></Card>
                <Card noPadding className="sm:col-span-2 lg:col-span-1"><div className="p-4"><div className="flex items-center"><div className={`p-3 rounded-full ${balance >=0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-orange-100 dark:bg-orange-500/20'}`}><DollarSign size={20} className={`${balance >=0 ? 'text-blue-600 dark:text-blue-300' : 'text-orange-500 dark:text-orange-400'}`} /></div><div className="ml-3"><p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Saldo</p><p className={`text-xl sm:text-2xl font-semibold ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(balance)}</p></div></div></div></Card>
            </div>
            <Card title="Despesas por Categoria" noPadding>
              <div className="h-80 p-4">
                {expensesByCategoryChartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensesByCategoryChartData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" labelLine={false} label={({ name, percent, value }) => `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}>{expensesByCategoryChartData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} wrapperClassName="!bg-white dark:!bg-gray-700 !border-gray-300 dark:!border-gray-600 rounded shadow-lg"/><Legend formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>} /></PieChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma despesa no período.</div>)}
              </div>
            </Card>
            <Card title="Relatório Financeiro Detalhado" noPadding>
                <div className="overflow-x-auto">
                    <table className="min-w-full"><thead className="bg-gray-100 dark:bg-gray-700/60"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Data</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Descrição</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Categoria</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tipo</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Valor</th></tr></thead><tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{detailedFinancialTransactions.map((transaction: DetailedReportTransaction) => (<tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40"><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDateDisplay(transaction.date)}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={transaction.description}>{transaction.description}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{transaction.category}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300'}`}>{transaction.type === 'income' ? 'Receita' : 'Despesa'}</span></td><td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{ (transaction.type === 'income' ? '+' : '-') + formatCurrency(transaction.amount)}</td></tr>))}{detailedFinancialTransactions.length === 0 && (<tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Nenhuma transação no período.</td></tr>)}</tbody>{(detailedFinancialTransactions.length > 0) && (<tfoot><tr className="bg-gray-100 dark:bg-gray-700/60"><td colSpan={4} className="px-6 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Saldo no Período</td><td className={`px-6 py-3 text-right text-sm font-bold ${balance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-400'}`}>{formatCurrency(balance)}</td></tr></tfoot>)}</table>
                </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

