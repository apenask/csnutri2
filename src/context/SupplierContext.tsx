import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Supplier } from '../types';
import { suppliers as initialSuppliersFallback } from '../data/mockData';

interface SupplierContextType {
  suppliers: Supplier[];
  addSupplier: (supplierData: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: string) => Promise<void>;
  getSupplierById: (id: string) => Supplier | undefined;
  isLoading: boolean;
}

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export const SupplierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    let loadedSuppliers: Supplier[] = initialSuppliersFallback;
    try {
      const savedSuppliers = localStorage.getItem('csNutriSuppliers');
      if (savedSuppliers) {
        loadedSuppliers = JSON.parse(savedSuppliers);
      } else {
        localStorage.setItem('csNutriSuppliers', JSON.stringify(initialSuppliersFallback));
      }
    } catch (error) {
      console.error('Falha ao carregar fornecedores do localStorage:', error);
      if (!localStorage.getItem('csNutriSuppliers')) {
        localStorage.setItem('csNutriSuppliers', JSON.stringify(initialSuppliersFallback));
      }
    }
    setSuppliers(loadedSuppliers);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('csNutriSuppliers', JSON.stringify(suppliers));
    }
  }, [suppliers, isLoading]);

  const addSupplier = async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    if (!supplierData.name || !supplierData.phone) {
      throw new Error('Nome e telefone do fornecedor são obrigatórios.');
    }
    const newSupplier: Supplier = {
      id: Date.now().toString(), 
      ...supplierData,
    };
    setSuppliers(prevSuppliers => [...prevSuppliers, newSupplier]);
    return newSupplier;
  };

  const updateSupplier = async (id: string, supplierData: Partial<Supplier>): Promise<Supplier> => {
    let updatedSupplierInstance: Supplier | null = null;
    setSuppliers(prevSuppliers =>
      prevSuppliers.map(s => {
        if (s.id === id) {
          updatedSupplierInstance = { ...s, ...supplierData };
          return updatedSupplierInstance;
        }
        return s;
      })
    );
    if (!updatedSupplierInstance) {
      throw new Error('Fornecedor não encontrado para atualização.');
    }
    return updatedSupplierInstance;
  };

  const deleteSupplier = async (id: string): Promise<void> => {
    setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== id));
  };

  const getSupplierById = (id: string): Supplier | undefined => {
    return suppliers.find(s => s.id === id);
  };

  return (
    <SupplierContext.Provider value={{ suppliers, addSupplier, updateSupplier, deleteSupplier, getSupplierById, isLoading }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = (): SupplierContextType => {
  const context = useContext(SupplierContext);
  if (context === undefined) {
    throw new Error('useSuppliers deve ser usado dentro de um SupplierProvider');
  }
  return context;
};