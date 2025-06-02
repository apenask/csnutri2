import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar 
} from 'recharts';
import { Calendar, DollarSign, Package, ShoppingCart, TrendingUp, TrendingDown, Users } from 'lucide-react'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSales } from '../context/SaleContext';
import { useProducts } from '../context/ProductContext';
import { useCustomers } from '../context/CustomerContext';
import { useExpenses } from '../context/ExpenseContext';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

type DateRangeType = 'day' | 'week' | 'month';

const DashboardPage: React.FC = () => {
  const { sales, isLoading: isLoadingSales } = useSales();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { customers, isLoading: isLoadingCustomers } = useCustomers();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('week');

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingCustomers || isLoadingExpenses;

  const formatCurrency = (value: number | undefined) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const currentPeriodDateRange = useMemo(() => {
    const today = new Date();
    switch (dateRangeType) {
      case 'day':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    }
  }, [dateRangeType]);

  const currentPeriodSales = useMemo(() => {
    if (isLoadingSales) return [];
    return sales.filter(sale => {
      try {
        const saleDate = parseISO(sale.date);
        return saleDate >= currentPeriodDateRange.start && saleDate <= currentPeriodDateRange.end;
      } catch { return []; }
    });
  }, [sales, currentPeriodDateRange, isLoadingSales]);

  const currentPeriodExpenses = useMemo(() => {
    if (isLoadingExpenses) return [];
    return expenses.filter(expense => {
      try {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= currentPeriodDateRange.start && expenseDate <= currentPeriodDateRange.end;
      } catch { return []; }
    });
  }, [expenses, currentPeriodDateRange, isLoadingExpenses]);
  
  const financialSummary = useMemo(() => {
    const income = currentPeriodSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExp = currentPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = income - totalExp;
    let periodLabel = 'Esta Semana';
    if (dateRangeType === 'day') periodLabel = 'Hoje';
    if (dateRangeType === 'month') periodLabel = 'Este Mês';
    return { income, expenses: totalExp, balance, period: periodLabel };
  }, [currentPeriodSales, currentPeriodExpenses, dateRangeType]);

  const salesChartData = useMemo(() => {
    if (isLoadingSales) return [];
    const salesByDay: { [key: string]: number } = {};
    let numberOfDaysForChart = 7;
    if (dateRangeType === 'month') {
        numberOfDaysForChart = Math.round((currentPeriodDateRange.end.getTime() - currentPeriodDateRange.start.getTime()) / (1000 * 3600 * 24)) +1;
        if (numberOfDaysForChart < 1) numberOfDaysForChart = 1; // Garante pelo menos 1 dia
    } else if (dateRangeType === 'day') {
        numberOfDaysForChart = 1;
    }
    for (let i = 0; i < numberOfDaysForChart; i++) {
        const dateKey = format(subDays(currentPeriodDateRange.end, numberOfDaysForChart - 1 - i), 'yyyy-MM-dd');
        salesByDay[dateKey] = 0;
    }
    currentPeriodSales.forEach(sale => {
        const dayKey = format(parseISO(sale.date), 'yyyy-MM-dd');
        if(salesByDay.hasOwnProperty(dayKey)) {
             salesByDay[dayKey] = (salesByDay[dayKey] || 0) + sale.total;
        }
    });
    return Object.entries(salesByDay)
      .map(([date, total]) => ({ date: format(parseISO(date), 'dd/MM'), fullDate: date, sales: total }))
      .sort((a, b) => parseISO(a.fullDate).getTime() - parseISO(b.fullDate).getTime());
  }, [currentPeriodSales, dateRangeType, isLoadingSales, currentPeriodDateRange]);

  const lowStockProducts = useMemo(() => {
    if (isLoadingProducts) return [];
    return products.filter(product => product.stock <= product.minStock);
  }, [products, isLoadingProducts]);

  const totalSalesCount = useMemo(() => sales.length, [sales]);
  const totalProductsCount = useMemo(() => products.length, [products]);
  const totalCustomersCount = useMemo(() => customers.length, [customers]);
  const overallTicketAverage = useMemo(() => {
    if (sales.length === 0) return 0;
    return sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length;
  }, [sales]);

  const salesByCategoryChartData = useMemo(() => {
    if (isLoadingSales || isLoadingProducts) return [];
    const categorySales: { [key: string]: number } = {};
    currentPeriodSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const categoryName = product.customCategory || product.category;
          categorySales[categoryName] = (categorySales[categoryName] || 0) + item.subtotal;
        }
      });
    });
    return Object.entries(categorySales).map(([name, value]) => ({ name, value }));
  }, [currentPeriodSales, products, isLoadingSales, isLoadingProducts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-700 dark:text-gray-300">Carregando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h1>
        <div className="flex space-x-1 sm:space-x-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow">
          {(['day', 'week', 'month'] as DateRangeType[]).map(type => (
            <Button
              key={type}
              onClick={() => setDateRangeType(type)}
              variant={dateRangeType === type ? 'primary' : 'outline'} // 'outline' para inativos
              size="sm"
              className={`capitalize ${dateRangeType !== type ? 'dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700' : ''}`}
            >
              {type === 'day' ? 'Hoje' : type === 'week' ? 'Semana' : 'Mês'}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card Receita */}
        <Card noPadding className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white">
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-white/20"><DollarSign size={24} /></div>
              <div className="ml-4">
                <p className="text-sm font-medium opacity-80">Receita ({financialSummary.period})</p>
                <p className="text-2xl font-semibold">{formatCurrency(financialSummary.income)}</p>
              </div>
            </div>
          </div>
        </Card>
        {/* Card Despesas */}
        <Card noPadding className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-gray-700 dark:to-gray-800 text-white">
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-white/20"><TrendingDown size={24} /></div>
              <div className="ml-4">
                <p className="text-sm font-medium opacity-80">Despesas ({financialSummary.period})</p>
                <p className="text-2xl font-semibold">{formatCurrency(financialSummary.expenses)}</p>
              </div>
            </div>
          </div>
        </Card>
        {/* Card Saldo */}
        <Card noPadding className={`text-white ${financialSummary.balance >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700' : 'bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700'}`}>
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-white/20 "><TrendingUp size={24} /></div>
              <div className="ml-4">
                <p className="text-sm font-medium opacity-80">Saldo ({financialSummary.period})</p>
                <p className="text-2xl font-semibold">{formatCurrency(financialSummary.balance)}</p>
              </div>
            </div>
          </div>
        </Card>
        {/* Card Total de Vendas */}
        <Card noPadding className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white">
          <div className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-white/20"><ShoppingCart size={24} /></div>
              <div className="ml-4">
                <p className="text-sm font-medium opacity-80">Total de Vendas (Geral)</p>
                <p className="text-2xl font-semibold">{totalSalesCount}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos e Visão Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card title={`Vendas (${financialSummary.period})`} className="lg:col-span-3" noPadding>
          <div className="h-80 p-4"> {/* Adicionado p-4 aqui */}
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesChartData} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}> {/* Ajustado left margin */}
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700"/>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400"/>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', borderColor: '#e5e7eb' }} // Estilo do tooltip claro
                    wrapperClassName="dark:![&_.recharts-tooltip-item]:!text-gray-800" // Força texto escuro no tooltip no dark mode
                    formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#E41E26" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0, fill: '#E41E26' }} dot={{r:3, fill: '#E41E26'}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma venda no período para exibir no gráfico.</div>)}
          </div>
        </Card>

        <Card title="Visão Geral" className="lg:col-span-2" noPadding>
          <div className="space-y-3 p-4"> {/* Adicionado p-4 aqui */}
            {[
              { icon: Package, label: "Total de Produtos", value: totalProductsCount },
              { icon: Users, label: "Total de Clientes", value: totalCustomersCount },
              { icon: Calendar, label: "Data", value: format(new Date(), 'dd/MM/yyyy') },
              { icon: DollarSign, label: "Ticket Médio (Geral)", value: formatCurrency(overallTicketAverage) }
            ].map((item, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <item.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                <div className="ml-3">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Produtos com Estoque Baixo e Vendas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card 
          title="Produtos com Estoque Baixo" 
          className="lg:col-span-2"
          noPadding
          headerAction={
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lowStockProducts.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}`}>
              {lowStockProducts.length} {lowStockProducts.length === 1 ? 'produto' : 'produtos'}
            </span>
          }
        >
          {lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto max-h-60"> {/* Adicionado padding na tabela se noPadding no Card */}
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estoque</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lowStockProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{product.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-500/30 dark:text-red-300">{product.stock}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center hidden sm:table-cell">{product.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400">
              <Package size={36} className="mx-auto mb-2 text-green-500 dark:text-green-400"/>
              <p>Todos os produtos estão com estoque adequado.</p>
            </div>
          )}
        </Card>

        <Card title={`Vendas por Categoria (${financialSummary.period})`} noPadding>
          <div className="h-80 p-4"> {/* Adicionado p-4 aqui */}
            {salesByCategoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByCategoryChartData} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}> {/* Aumentada margem esquerda */}
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-gray-700"/>
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400"/>
                  <YAxis dataKey="name" type="category" width={90} interval={0} tick={{fontSize: 10, fill: 'currentColor', width: 85 }} className="text-gray-600 dark:text-gray-400 truncate"/>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '0.5rem', borderColor: '#e5e7eb' }}
                    wrapperClassName="dark:![&_.recharts-tooltip-item]:!text-gray-800"
                    formatter={(value: number) => [formatCurrency(value), 'Total Vendas']}
                  />
                  <Bar dataKey="value" fill="#E41E26" barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Nenhuma venda para exibir categorias.</div>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;