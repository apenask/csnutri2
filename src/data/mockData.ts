import { User, Product, Customer, Sale, Expense, Supplier } from '../types'; // Removido StockTransaction e PaymentDetail da importação direta
import { format, subDays } from 'date-fns';

// Mock Users
export const users: User[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In real app, this would be hashed
    name: 'Admin User',
    email: 'admin@email.com',
    role: 'admin',
  },
  {
    id: '2',
    username: 'user',
    password: 'user123', // In real app, this would be hashed
    name: 'Regular User',
    email: 'user@email.com',
    role: 'user',
  },
];

// Mock Products
export const products: Product[] = [
  {
    id: '1',
    name: 'Whey Protein 900g',
    category: 'Supplements',
    price: 199.90,
    cost: 120.00,
    stock: 25,
    minStock: 5,
  },
  {
    id: '2',
    name: 'BCAA 300g',
    category: 'Supplements',
    price: 89.90,
    cost: 45.00,
    stock: 18,
    minStock: 3,
  },
  {
    id: '3',
    name: 'Creatine 300g',
    category: 'Supplements',
    price: 79.90,
    cost: 40.00,
    stock: 15,
    minStock: 3,
  },
  {
    id: '4',
    name: 'Pre-Workout 300g',
    category: 'Supplements',
    price: 129.90,
    cost: 70.00,
    stock: 12,
    minStock: 2,
  },
  {
    id: '5',
    name: 'Protein Bar',
    category: 'Snacks',
    price: 12.90,
    cost: 6.50,
    stock: 40,
    minStock: 10,
  },
];

// Mock Customers
export const customers: Customer[] = [
  {
    id: '1',
    name: 'João Silva',
    phone: '(11) 98765-4321',
    email: 'joao.silva@email.com',
    address: 'Rua das Flores, 123',
    points: 120,
    totalSpent: 1200.50,
    totalPurchases: 8,
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    phone: '(11) 91234-5678',
    email: 'maria.oliveira@email.com',
    address: 'Av. Paulista, 1000',
    points: 80,
    totalSpent: 800.00,
    totalPurchases: 5,
  },
  {
    id: '3',
    name: 'Pedro Santos',
    phone: '(11) 95555-9999',
    email: 'pedro.santos@email.com',
    address: '', // Endereço pode ser opcional ou string vazia
    points: 40,
    totalSpent: 400.00,
    totalPurchases: 2,
  },
];

// Mock Suppliers
export const suppliers: Supplier[] = [
  {
    id: '1',
    name: 'Distribuidora Suplementos Brasil',
    phone: '(11) 3333-4444',
    email: 'contato@dsb.com',
    address: 'Rua Industrial, 500',
  },
  {
    id: '2',
    name: 'Nutrição Esportiva Ltda',
    phone: '(11) 2222-8888',
    email: 'vendas@nel.com',
    address: 'Av. dos Esportes, 200',
  },
];

// Helper function to generate dates
const getDate = (daysAgo: number) => format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

// Mock Sales
export const sales: Sale[] = [
  {
    id: '1',
    date: getDate(1),
    items: [
      { productId: '1', quantity: 2, price: 199.90, subtotal: 399.80 },
      { productId: '5', quantity: 3, price: 12.90, subtotal: 38.70 },
    ],
    total: 438.50,
    payments: [{ method: 'credit', amount: 438.50 }], 
    customerId: '1',
    userId: '1',
    pointsEarned: Math.floor(438.50 / 10),
  },
  {
    id: '2',
    date: getDate(2),
    items: [
      { productId: '3', quantity: 1, price: 79.90, subtotal: 79.90 },
      { productId: '4', quantity: 1, price: 129.90, subtotal: 129.90 },
    ],
    total: 209.80,
    payments: [{ method: 'pix', amount: 209.80 }], 
    customerId: '2',
    userId: '1',
    pointsEarned: Math.floor(209.80 / 10),
  },
  {
    id: '3',
    date: getDate(3),
    items: [
      { productId: '2', quantity: 2, price: 89.90, subtotal: 179.80 },
    ],
    total: 179.80,
    payments: [{ method: 'cash', amount: 179.80 }], 
    userId: '1',
    pointsEarned: Math.floor(179.80 / 10),
  },
  {
    id: '4',
    date: getDate(4),
    items: [
      { productId: '1', quantity: 1, price: 199.90, subtotal: 199.90 },
      { productId: '3', quantity: 1, price: 79.90, subtotal: 79.90 },
      { productId: '5', quantity: 2, price: 12.90, subtotal: 25.80 },
    ],
    total: 305.60,
    payments: [{ method: 'debit', amount: 305.60 }], 
    customerId: '3',
    userId: '1',
    pointsEarned: Math.floor(305.60 / 10),
  },
  {
    id: '5',
    date: getDate(0),
    items: [
      { productId: '4', quantity: 2, price: 129.90, subtotal: 259.80 },
    ],
    total: 259.80,
    payments: [{ method: 'credit', amount: 259.80 }], 
    customerId: '1',
    userId: '1',
    pointsEarned: Math.floor(259.80 / 10),
  },
];

// Mock Expenses
export const expenses: Expense[] = [
  {
    id: '1',
    date: getDate(6),
    description: 'Compra de estoque - Whey Protein',
    amount: 1200.00,
    category: 'Inventory', 
    supplierId: '1',
  },
  {
    id: '2',
    date: getDate(6),
    description: 'Compra de estoque - BCAA e Creatina',
    amount: 850.00,
    category: 'Inventory',
    supplierId: '2',
  },
  {
    id: '3',
    date: getDate(5),
    description: 'Aluguel da loja',
    amount: 2500.00,
    category: 'Rent',
  },
  {
    id: '4',
    date: getDate(4),
    description: 'Conta de energia',
    amount: 350.00,
    category: 'Utilities',
  },
  {
    id: '5',
    date: getDate(1),
    description: 'Material de escritório',
    amount: 150.00,
    category: 'Office Supplies',
  },
];

// Mock Stock Transactions removido para evitar erro, já que o tipo não está definido/exportado
// export const stockTransactions: StockTransaction[] = [ ... ];

// Generate sales data for chart
export const generateSalesData = (days: number) => {
  return Array.from({ length: days }).map((_, index) => {
    const date = format(subDays(new Date(), days - 1 - index), 'yyyy-MM-dd');
    const daysSales = sales.filter(sale => sale.date === date);
    const dailyTotal = daysSales.reduce((sum, sale) => sum + sale.total, 0);
    
    return {
      date, 
      sales: dailyTotal, 
    };
  });
};

// Generate financial summary
export const getFinancialSummary = (period: string): { income: number; expenses: number; balance: number, period: string } => {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  return {
    income: totalSales,
    expenses: totalExpenses,
    balance: totalSales - totalExpenses,
    period 
  };
};
