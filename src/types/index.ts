// src/types/index.ts
// CORREÇÃO: Removida a importação de chart.js se não estiver sendo usada
// import { ChartData, ChartOptions } from 'chart.js'; 

export interface User {
  id: string;
  username: string;
  password: string; 
  name: string;
  email: string;
  role: 'admin' | 'user';
  points?: number;
  permissions?: string[];
  profilePictureUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  cost: number;
  category: string;
  supplierId?: string;
  barcode?: string;
  imageUrl?: string;
  customCategory?: string; 
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  cpf?: string;
  points: number; 
  totalSpent: number; 
  totalPurchases: number; 
  customCategory?: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number; 
  subtotal: number;
}

export interface PaymentDetail {
  method: 'cash' | 'credit' | 'debit' | 'pix' | string;
  amount: number;
  transactionId?: string;
}

export interface Sale {
  id: string;
  date: string; 
  items: SaleItem[];
  total: number; 
  payments: PaymentDetail[]; 
  customerId?: string;
  userId: string; 
  pointsEarned?: number;
}

export interface Expense {
  id: string;
  date: string; 
  description: string;
  amount: number;
  category: string; 
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
}

// export interface StockTransaction { // Mantenha comentado ou defina se for usar
//   id: string;
//   date: string;
//   productId: string;
//   quantity: number; 
//   type: 'in' | 'out';
//   reason: string; 
// }

export interface FinancialSummary {
  income: number;
  expenses: number;
  balance: number;
  period: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface PointsSystem {
  pointsPerPurchase: number;
  rewardThreshold: number;
  rewardDescription: string;
}

export interface SiteSettings {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
}

export interface SystemBackup {
  timestamp: string;
  appName?: string; 
  appVersion?: string; 
  data: {
    users: User[];
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    expenses: Expense[];
    suppliers: Supplier[];
    // stockTransactions?: StockTransaction[]; 
    siteSettings: SiteSettings;
  };
}

// src/types/index.ts
// ... outras interfaces ...

export interface PaymentDetail {
  method: 'cash' | 'credit' | 'debit' | 'pix' | string;
  amount: number;
  transactionId?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  payments: PaymentDetail[]; // <--- Array para múltiplos pagamentos
  customerId?: string;
  userId: string;
  pointsEarned?: number;
  // paymentMethod: string; // <--- Esta linha não existe no seu tipo atual, o que é bom!
                           // No entanto, o mockData e POSPage usam um paymentMethod singular.
}

// ... outras interfaces ...

// CORREÇÃO: Removidos os tipos relacionados a chart.js se não estiverem sendo usados
// export type ReportData = {
//   labels: string[];
//   datasets: {
//     label: string;
//     data: number[];
//     backgroundColor: string | string[];
//     borderColor?: string | string[];
//     borderWidth?: number;
//     tension?: number;
//     fill?: boolean;
//   }[];
// };

// export type ChartJsData = ChartData<'bar' | 'line' | 'pie', number[], string>;
// export type ChartJsOptions = ChartOptions<'bar' | 'line' | 'pie'>;