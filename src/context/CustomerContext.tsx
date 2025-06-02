// Arquivo: src/context/CustomerContext.tsx
// Responsável por gerenciar todas as operações relacionadas a clientes.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer } from '../types'; // Importa a interface Customer
import { customers as initialCustomersFallback } from '../data/mockData'; // Fallback inicial

// Define a estrutura do que será exposto pelo contexto de clientes
interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customerData: Omit<Customer, 'id' | 'points' | 'totalPurchases' | 'totalSpent' | 'customCategory'> & { address?: string; email: string; category?: string }) => Promise<Customer>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  isLoading: boolean;
}

// Cria o Contexto React para Clientes
const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

// Componente Provedor
export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Efeito para carregar clientes do localStorage ou usar fallback
  useEffect(() => {
    let loadedCustomers: Customer[] = initialCustomersFallback.map(c => ({
        ...c,
        points: c.points || 0,
        totalPurchases: c.totalPurchases || 0,
        totalSpent: c.totalSpent || 0, // GARANTIR INICIALIZAÇÃO
        customCategory: c.customCategory || undefined, 
    }));
    try {
      const savedCustomers = localStorage.getItem('csNutriCustomers');
      if (savedCustomers) {
        const parsedCustomers = JSON.parse(savedCustomers) as Customer[];
        loadedCustomers = parsedCustomers.map(c => ({
            ...c,
            points: c.points || 0,
            totalPurchases: c.totalPurchases || 0,
            totalSpent: c.totalSpent || 0,
            customCategory: c.customCategory || undefined, // Garante que exista
        }));
      } else {
        localStorage.setItem('csNutriCustomers', JSON.stringify(loadedCustomers));
      }
    } catch (error) {
      console.error('Falha ao carregar clientes do localStorage:', error);
      if (!localStorage.getItem('csNutriCustomers')) {
        localStorage.setItem('csNutriCustomers', JSON.stringify(loadedCustomers));
      }
    }
    setCustomers(loadedCustomers);
    setIsLoading(false);
  }, []); // Array de dependências vazio para executar apenas na montagem

  // Efeito para salvar clientes no localStorage quando a lista mudar
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('csNutriCustomers', JSON.stringify(customers));
    }
  }, [customers, isLoading]);

  // Função para adicionar um novo cliente
  const addCustomer = async (
    customerData: Omit<Customer, 'id' | 'points' | 'totalPurchases' | 'totalSpent' | 'customCategory'> & { address?: string; email: string; category?: string }
    ): Promise<Customer> => {
    if (!customerData.name || !customerData.phone || !customerData.email) {
      throw new Error('Nome, telefone e email são obrigatórios para o cliente.');
    }
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
      points: 0,
      totalPurchases: 0,
      totalSpent: 0, // Inicializado aqui
      category: customerData.category,
      customCategory: undefined,
    };
    setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
    return newCustomer;
  };

  // Função para atualizar um cliente existente
  const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<Customer> => {
    let updatedCustomerInstance: Customer | null = null;
    setCustomers(prevCustomers =>
      prevCustomers.map(c => {
        if (c.id === id) {
          updatedCustomerInstance = { ...c, ...customerData };
          return updatedCustomerInstance;
        }
        return c;
      })
    );
    if (!updatedCustomerInstance) {
      throw new Error('Cliente não encontrado para atualização.');
    }
    return updatedCustomerInstance;
  };

  // Função para deletar um cliente
  const deleteCustomer = async (id: string): Promise<void> => {
    setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== id));
  };

  // Função para buscar um cliente por ID
  const getCustomerById = (id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  };

  // Retorna o Provedor do Contexto
  return (
    <CustomerContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, getCustomerById, isLoading }}>
      {children}
    </CustomerContext.Provider>
  );
};

// Hook customizado para usar o Contexto de Clientes
// Certifique-se de que esta linha está exatamente assim:
export const useCustomers = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers deve ser usado dentro de um CustomerProvider');
  }
  return context;
};
