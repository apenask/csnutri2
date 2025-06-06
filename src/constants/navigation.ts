import {
  Home, ShoppingCart, ListOrdered, Package, Users as UsersIcon, Truck,
  DollarSign, FileText
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  icon: React.ElementType;
  href: string;
}

export const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', icon: Home, href: '/dashboard' },
  { name: 'PDV', icon: ShoppingCart, href: '/pos' },
  { name: 'Vendas', icon: ListOrdered, href: '/sales' },
  { name: 'Produtos', icon: Package, href: '/products' },
  { name: 'Clientes', icon: UsersIcon, href: '/customers' },
  { name: 'Fornecedores', icon: Truck, href: '/suppliers' },
  { name: 'Financeiro', icon: DollarSign, href: '/finance' },
  { name: 'Relatórios', icon: FileText, href: '/reports' },
];