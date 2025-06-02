// src/context/SaleContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Sale, Product, Customer } from '../types'; // Adicionado Product e Customer para interações
import { sales as initialSalesFallback } from '../data/mockData'; //
import { useProducts } from './ProductContext'; // Para interagir com o estoque
import { useCustomers } from './CustomerContext'; // Para interagir com os dados do cliente

interface SaleContextType {
  sales: Sale[];
  addSale: (saleData: Omit<Sale, 'id'>) => Promise<Sale>;
  deleteSale: (saleId: string) => Promise<void>;
  updateSale: (saleId: string, updatedSaleData: Partial<Pick<Sale, 'date' | 'paymentMethod' | 'customerId'>>) => Promise<Sale>; // Edição simplificada
  getSalesByCustomerId: (customerId: string) => Sale[];
  getSalesByDateRange: (startDate: string, endDate: string) => Sale[];
  getSaleById: (saleId: string) => Sale | undefined;
  isLoading: boolean;
}

const SaleContext = createContext<SaleContextType | undefined>(undefined);

export const SaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sales, setSales] = useState<Sale[]>([]);

  const { updateProduct: updateProductStock } = useProducts(); // Hook do ProductContext
  const { updateCustomer: updateCustomerInfo, getCustomerById } = useCustomers(); // Hook do CustomerContext

  useEffect(() => {
    let loadedSales: Sale[] = initialSalesFallback;
    try {
      const savedSales = localStorage.getItem('csNutriSales');
      if (savedSales) {
        loadedSales = JSON.parse(savedSales);
      } else {
        localStorage.setItem('csNutriSales', JSON.stringify(initialSalesFallback));
      }
    } catch (error) {
      console.error('Falha ao carregar vendas do localStorage:', error);
      if (!localStorage.getItem('csNutriSales')) {
        localStorage.setItem('csNutriSales', JSON.stringify(initialSalesFallback));
      }
    }
    setSales(loadedSales);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('csNutriSales', JSON.stringify(sales));
    }
  }, [sales, isLoading]);

  const addSale = async (saleData: Omit<Sale, 'id'>): Promise<Sale> => {
    const newSale: Sale = {
      id: Date.now().toString(),
      ...saleData,
    };
    setSales(prevSales => [...prevSales, newSale]);
    // A lógica de atualização de estoque e cliente já deve estar no POSPage ao chamar addSale.
    // Se não estiver, precisaria ser adicionada aqui ou garantir que POSPage o faça.
    return newSale;
  };

  const deleteSale = async (saleId: string): Promise<void> => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) {
      throw new Error("Venda não encontrada para exclusão.");
    }

    // 1. Restaurar estoque dos produtos
    for (const item of saleToDelete.items) {
      try {
        // Assumindo que updateProductStock pode lidar com incremento
        // (ou você busca o produto, soma a quantidade e atualiza)
        const product = await updateProductStock(item.productId, { stockIncrement: item.quantity });
        if (!product) console.warn(`Produto com ID ${item.productId} não encontrado para restaurar estoque.`);
      } catch (error) {
        console.error(`Erro ao restaurar estoque para o produto ${item.productId}:`, error);
        // Considere como lidar com falhas parciais. Por enquanto, continua.
      }
    }

    // 2. Reverter dados do cliente (se houver cliente associado)
    if (saleToDelete.customerId) {
      const customer = getCustomerById(saleToDelete.customerId);
      if (customer) {
        const updatedCustomerData: Partial<Customer> = {
          totalPurchases: Math.max(0, (customer.totalPurchases || 0) - 1),
          totalSpent: Math.max(0, (customer.totalSpent || 0) - saleToDelete.total),
          points: Math.max(0, (customer.points || 0) - (saleToDelete.pointsEarned || 0)),
        };
        try {
          await updateCustomerInfo(saleToDelete.customerId, updatedCustomerData);
        } catch (error) {
          console.error(`Erro ao reverter dados do cliente ${saleToDelete.customerId}:`, error);
        }
      }
    }

    // 3. Remover a venda da lista
    setSales(prevSales => prevSales.filter(sale => sale.id !== saleId));
  };

  const updateSale = async (saleId: string, updatedSaleData: Partial<Pick<Sale, 'date' | 'paymentMethod' | 'customerId'>>): Promise<Sale> => {
    // ATENÇÃO: Esta é uma atualização simplificada.
    // Editar itens, total, ou cliente em uma venda existente pode ter implicações complexas
    // no estoque e nos dados do cliente anterior/novo, que não estão totalmente tratadas aqui.
    // Por exemplo, se o cliente mudar, os totais do cliente antigo deveriam ser revertidos e
    // os do novo cliente atualizados. Se os itens/total mudarem, o estoque e os totais do cliente
    // precisariam ser recalculados.

    let saleInstance: Sale | null = null;
    setSales(prevSales =>
      prevSales.map(sale => {
        if (sale.id === saleId) {
          saleInstance = { ...sale, ...updatedSaleData };
          return saleInstance;
        }
        return sale;
      })
    );
    if (!saleInstance) {
      throw new Error("Venda não encontrada para atualização.");
    }
    return saleInstance;
  };
  
  const getSaleById = (saleId: string): Sale | undefined => {
    return sales.find(s => s.id === saleId);
  };

  const getSalesByCustomerId = (customerId: string): Sale[] => {
    return sales.filter(sale => sale.customerId === customerId);
  };

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

export const useSales = (): SaleContextType => {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error('useSales deve ser usado dentro de um SaleProvider');
  }
  return context;
};