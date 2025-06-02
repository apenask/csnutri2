// src/context/ExpenseContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Expense } from '../types'; 
import { expenses as initialExpensesFallback } from '../data/mockData'; 

interface ExpenseContextType {
  expenses: Expense[];
  addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>; 
  updateExpense: (id: string, expenseData: Partial<Expense>) => Promise<Expense>; 
  getExpensesByDateRange: (startDate: string, endDate: string) => Expense[];
  isLoading: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    let loadedExpenses: Expense[] = initialExpensesFallback.map(e => ({
        ...e,
        amount: Number(e.amount) || 0, // Garante que amount seja número
    }));
    try {
      const savedExpenses = localStorage.getItem('csNutriExpenses');
      if (savedExpenses) {
        const parsedExpenses = JSON.parse(savedExpenses) as Expense[];
        loadedExpenses = parsedExpenses.map(e => ({
            ...e,
            amount: Number(e.amount) || 0, // Garante que amount seja número ao carregar
        }));
      } else {
        localStorage.setItem('csNutriExpenses', JSON.stringify(loadedExpenses));
      }
    } catch (error) {
      console.error('Falha ao carregar despesas do localStorage:', error);
      if (!localStorage.getItem('csNutriExpenses')) {
        localStorage.setItem('csNutriExpenses', JSON.stringify(loadedExpenses));
      }
    }
    setExpenses(loadedExpenses);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const expensesToSave = expenses.map(e => ({
        ...e,
        amount: Number(e.amount) || 0, // Garante que amount seja número ao salvar
      }));
      localStorage.setItem('csNutriExpenses', JSON.stringify(expensesToSave));
    }
  }, [expenses, isLoading]);

  const addExpense = async (expenseData: Omit<Expense, 'id'>): Promise<Expense> => {
    if (!expenseData.description || expenseData.amount == null || !expenseData.category || !expenseData.date) { // Verificação ajustada para amount
        throw new Error('Descrição, valor, categoria e data são obrigatórios para a despesa.');
    }
    if (Number(expenseData.amount) <= 0) {
        throw new Error('O valor da despesa deve ser maior que zero.');
    }
    const newExpense: Expense = {
      id: Date.now().toString(),
      ...expenseData,
      amount: Number(expenseData.amount), // Garante que amount seja número
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
          const updatedData = { ...expenseData };
          if (updatedData.amount !== undefined) {
            updatedData.amount = Number(updatedData.amount); // Garante que amount seja número
            if (updatedData.amount <= 0) {
                // Lançar erro ou tratar aqui se a atualização resultar em valor inválido
                // Para consistência com addExpense, podemos lançar um erro.
                // No entanto, isso pode ser disruptivo se o update vier de um formulário que já deveria ter validado.
                // Por ora, vamos converter. A validação de > 0 pode ficar no formulário que chama updateExpense.
                if (isNaN(updatedData.amount)) updatedData.amount = exp.amount; // Reverte se NaN
            }
          }
          updatedExpenseInstance = { ...exp, ...updatedData };
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
    end.setHours(23, 59, 59, 999); 
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
