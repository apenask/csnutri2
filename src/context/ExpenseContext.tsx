// src/context/ExpenseContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Expense } from '../types'; //
import { expenses as initialExpensesFallback } from '../data/mockData'; //

interface ExpenseContextType {
  expenses: Expense[];
  addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>; // Adicionando delete
  updateExpense: (id: string, expenseData: Partial<Expense>) => Promise<Expense>; // Adicionando update
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  isLoading: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    let loadedExpenses: Expense[] = initialExpensesFallback;
    try {
      const savedExpenses = localStorage.getItem('csNutriExpenses');
      if (savedExpenses) {
        loadedExpenses = JSON.parse(savedExpenses);
      } else {
        localStorage.setItem('csNutriExpenses', JSON.stringify(initialExpensesFallback));
      }
    } catch (error) {
      console.error('Falha ao carregar despesas do localStorage:', error);
      if (!localStorage.getItem('csNutriExpenses')) {
        localStorage.setItem('csNutriExpenses', JSON.stringify(initialExpensesFallback));
      }
    }
    setExpenses(loadedExpenses);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('csNutriExpenses', JSON.stringify(expenses));
    }
  }, [expenses, isLoading]);

  const addExpense = async (expenseData: Omit<Expense, 'id'>): Promise<Expense> => {
    if (!expenseData.description || !expenseData.amount || !expenseData.category || !expenseData.date) {
        throw new Error('Descrição, valor, categoria e data são obrigatórios para a despesa.');
    }
    const newExpense: Expense = {
      id: Date.now().toString(),
      ...expenseData,
    };
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
    return newExpense;
  };

  const deleteExpense = async (id: string): Promise<void> => {
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>): Promise<Expense> => {
    let updatedExpenseInstance: Expense | null = null;
    setExpenses(prevExpenses =>
      prevExpenses.map(exp => {
        if (exp.id === id) {
          updatedExpenseInstance = { ...exp, ...expenseData };
          return updatedExpenseInstance;
        }
        return exp;
      })
    );
    if (!updatedExpenseInstance) {
      throw new Error('Despesa não encontrada para atualização.');
    }
    return updatedExpenseInstance;
  };
  
  const getExpensesByDateRange = (startDate: string, endDate: string): Expense[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Incluir todo o dia final
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= start && expenseDate <= end;
    });
  };

  return (
    <ExpenseContext.Provider value={{ expenses, addExpense, deleteExpense, updateExpense, getExpensesByDateRange, isLoading }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = (): ExpenseContextType => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses deve ser usado dentro de um ExpenseProvider');
  }
  return context;
};