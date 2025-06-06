import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Sale } from '../types'; // Removido Customer, SaleItem, PaymentDetail
import { supabase } from '../lib/supabaseClient';
import { useProducts } from './useProducts';
import { useCustomers } from './CustomerContext';
import { Database } from '../types/supabase'; // Importando o tipo principal do Supabase

// Tipo para representar a estrutura completa retornada pela nossa query
type SaleWithRelations = Database['public']['Tables']['sales']['Row'] & {
  sale_items: Database['public']['Tables']['sale_items']['Row'][];
  sale_payments: Database['public']['Tables']['sale_payments']['Row'][];
};

export interface SaleContextType {
  sales: Sale[];
  addSale: (saleData: Omit<Sale, 'id'>) => Promise<Sale>;
  deleteSale: (saleId: string) => Promise<void>;
  updateSale: (saleId: string, updatedSaleData: Partial<Pick<Sale, 'date' | 'customerId'>>) => Promise<Sale>;
  getSalesByCustomerId: (customerId: string) => Sale[];
  getSalesByDateRange: (startDate: string, endDate: string) => Sale[];
  getSaleById: (saleId: string) => Sale | undefined;
  isLoading: boolean;
}

export const SaleContext = createContext<SaleContextType | undefined>(undefined);

// Helper para transformar dados do Supabase (snake_case) para o formato do App (camelCase)
const fromSupabaseToApp = (sale: SaleWithRelations): Sale => ({
  id: sale.id,
  date: sale.date,
  total: sale.total,
  customerId: sale.customer_id || undefined,
  userId: sale.user_id || '',
  pointsEarned: sale.points_earned || 0,
  items: sale.sale_items.map(i => ({
    productId: i.product_id,
    quantity: i.quantity,
    price: i.price,
    subtotal: i.subtotal,
  })),
  payments: sale.sale_payments.map(p => ({
    method: p.method,
    amount: p.amount,
    transactionId: p.transaction_id || undefined,
  })),
});


export const SaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sales, setSales] = useState<Sale[]>([]);
  
  const { updateProduct: updateProductStock, getProductById } = useProducts();
  const { updateCustomer: updateCustomerInfo, getCustomerById } = useCustomers();

  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('sales')
        .select(`*, sale_items (*), sale_payments (*)`);

      if (error) {
        console.error('Erro ao buscar vendas:', error);
        setSales([]);
      } else {
        const combinedSales: Sale[] = data.map(fromSupabaseToApp);
        setSales(combinedSales);
      }
      setIsLoading(false);
    };

    fetchSales();
  }, []);

  const addSale = async (saleData: Omit<Sale, 'id'>): Promise<Sale> => {
    const newSaleId = Date.now().toString();
    const { items, payments, ...saleDetails } = saleData;

    const { error: saleError } = await supabase.from('sales').insert([{ 
        id: newSaleId,
        date: saleDetails.date,
        total: saleDetails.total,
        customer_id: saleDetails.customerId,
        user_id: saleDetails.userId,
        points_earned: saleDetails.pointsEarned
    }]);
    if (saleError) throw saleError;

    await Promise.all([
        supabase.from('sale_items').insert(items.map(item => ({ sale_id: newSaleId, product_id: item.productId, quantity: item.quantity, price: item.price, subtotal: item.subtotal }))),
        supabase.from('sale_payments').insert(payments.map(p => ({ sale_id: newSaleId, method: p.method, amount: p.amount, transaction_id: p.transactionId })))
    ]);

    const { data: newSaleFromDB, error: fetchError } = await supabase.from('sales').select(`*, sale_items(*), sale_payments(*)`).eq('id', newSaleId).single();
    if (fetchError) throw fetchError;
    
    const finalSaleObject = fromSupabaseToApp(newSaleFromDB);
    
    setSales(prev => [...prev, finalSaleObject]);
    return finalSaleObject;
  };

  const deleteSale = async (saleId: string): Promise<void> => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) throw new Error("Venda não encontrada para exclusão.");

    for (const item of saleToDelete.items) {
      const product = getProductById(item.productId);
      if (product) await updateProductStock(item.productId, { stock: (product.stock || 0) + item.quantity });
    }

    if (saleToDelete.customerId) {
      const customer = getCustomerById(saleToDelete.customerId);
      if (customer) {
        await updateCustomerInfo(saleToDelete.customerId, {
          totalPurchases: Math.max(0, (customer.totalPurchases || 0) - 1),
          totalSpent: Math.max(0, (customer.totalSpent || 0) - saleToDelete.total),
          points: Math.max(0, (customer.points || 0) - (saleToDelete.pointsEarned || 0)),
        });
      }
    }

    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) throw error;

    setSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
  };
  
  const updateSale = async (saleId: string, updatedSaleData: Partial<Pick<Sale, 'date' | 'customerId'>>): Promise<Sale> => {
    const { data: updatedSale, error } = await supabase.from('sales').update({
        date: updatedSaleData.date,
        customer_id: updatedSaleData.customerId
    }).eq('id', saleId).select(`*, sale_items(*), sale_payments(*)`).single();
    
    if (error) throw error;
    
    const finalSaleObject = fromSupabaseToApp(updatedSale);
    setSales(prevSales => prevSales.map(sale => sale.id === saleId ? finalSaleObject : sale));
    return finalSaleObject;
  };

  const getSaleById = (id: string): Sale | undefined => sales.find(s => s.id === id);
  const getSalesByCustomerId = (customerId: string): Sale[] => sales.filter(s => s.customerId === customerId);
  const getSalesByDateRange = (startDate: string, endDate: string): Sale[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= start && saleDate <= end;
    });
  };

  return (
    <SaleContext.Provider value={{ sales, addSale, deleteSale, updateSale, getSalesByCustomerId, getSalesByDateRange, getSaleById, isLoading }}>
      {children}
    </SaleContext.Provider>
  );
};