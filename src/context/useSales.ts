import { useContext } from 'react';
import { SaleContext, SaleContextType } from './SaleContext';

export const useSales = (): SaleContextType => {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error('useSales deve ser usado dentro de um SaleProvider');
  }
  return context;
};