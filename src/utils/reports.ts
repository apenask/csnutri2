import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sale, Expense, Customer, Product } from '../types';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (date: string): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

export const generateFinancialReport = (
  sales: Sale[],
  expenses: Expense[],
  startDate: string,
  endDate: string
): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Relatório Financeiro', 105, 15, { align: 'center' });
  
  // Period
  doc.setFontSize(12);
  doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 105, 25, { align: 'center' });
  
  // Summary
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = totalSales - totalExpenses;
  
  doc.text('Resumo Financeiro', 14, 40);
  doc.text(`Receitas: ${formatCurrency(totalSales)}`, 14, 50);
  doc.text(`Despesas: ${formatCurrency(totalExpenses)}`, 14, 60);
  doc.text(`Saldo: ${formatCurrency(balance)}`, 14, 70);
  
  // Sales Table
  doc.text('Vendas', 14, 90);
  
  // @ts-ignore
  doc.autoTable({
    startY: 95,
    head: [['Data', 'Descrição', 'Forma de Pagamento', 'Valor']],
    body: sales.map(sale => [
      formatDate(sale.date),
      `Venda #${sale.id}`,
      sale.paymentMethod.toUpperCase(),
      formatCurrency(sale.total)
    ]),
    foot: [['', '', 'Total', formatCurrency(totalSales)]],
  });
  
  // Expenses Table
  doc.text('Despesas', 14, doc.lastAutoTable.finalY + 20);
  
  // @ts-ignore
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 25,
    head: [['Data', 'Descrição', 'Categoria', 'Valor']],
    body: expenses.map(expense => [
      formatDate(expense.date),
      expense.description,
      expense.category,
      formatCurrency(expense.amount)
    ]),
    foot: [['', '', 'Total', formatCurrency(totalExpenses)]],
  });
  
  // Save the PDF
  doc.save(`relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateCustomerReport = (customers: Customer[], sales: Sale[]): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Relatório de Clientes', 105, 15, { align: 'center' });
  
  // Customer Statistics
  const customerStats = customers.map(customer => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    return {
      ...customer,
      totalSales: customerSales.length,
      totalSpent,
      averageTicket: totalSales > 0 ? totalSpent / customerSales.length : 0
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
  
  // @ts-ignore
  doc.autoTable({
    startY: 30,
    head: [['Cliente', 'Compras', 'Total Gasto', 'Ticket Médio', 'Pontos']],
    body: customerStats.map(customer => [
      customer.name,
      customer.totalSales,
      formatCurrency(customer.totalSpent),
      formatCurrency(customer.averageTicket),
      customer.points
    ]),
  });
  
  // Save the PDF
  doc.save(`relatorio-clientes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateInventoryReport = (products: Product[]): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Relatório de Estoque', 105, 15, { align: 'center' });
  
  // Products Table
  // @ts-ignore
  doc.autoTable({
    startY: 30,
    head: [['Produto', 'Categoria', 'Estoque', 'Mínimo', 'Custo', 'Preço', 'Valor Total']],
    body: products.map(product => [
      product.name,
      product.category,
      product.stock,
      product.minStock,
      formatCurrency(product.cost),
      formatCurrency(product.price),
      formatCurrency(product.stock * product.cost)
    ]),
    foot: [['', '', '', '', '', 'Total', formatCurrency(
      products.reduce((sum, product) => sum + (product.stock * product.cost), 0)
    )]],
  });
  
  // Save the PDF
  doc.save(`relatorio-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};