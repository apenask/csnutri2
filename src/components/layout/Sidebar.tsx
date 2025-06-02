import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, ShoppingCart, ListOrdered, Package, Users as UsersIcon, Truck, 
  DollarSign, FileText, Settings, User, LogOut
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

const Sidebar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
      logout();
    }
  };

  const filteredNavigation = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return navigationItems; // Admin vê todos os itens principais
    }
    return navigationItems.filter(item => 
      currentUser.permissions?.includes(item.href)
    );
  }, [currentUser]);

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white w-64">
      <div className="flex items-center justify-center h-16 px-4 bg-red-600">
        <h1 className="text-xl font-bold text-white">CS Nutri</h1>
      </div>
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      
      {/* Links de Configurações e Perfil */}
      <div className="px-2 py-2 border-t border-gray-700">
        <NavLink to="/profile" className={({ isActive }) => `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${ isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white' }`}>
          <User className="mr-3 h-5 w-5" /> Perfil
        </NavLink>
        {currentUser?.role === 'admin' && (
           <NavLink to="/settings" className={({ isActive }) => `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${ isActive ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white' }`}>
            <Settings className="mr-3 h-5 w-5" /> Configurações
          </NavLink>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <button onClick={() => navigate('/profile')} className="flex-shrink-0">
            {currentUser?.profilePictureUrl ? (
              <img src={currentUser.profilePictureUrl} alt="Perfil" className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-600 hover:ring-red-500" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center ring-1 ring-gray-600 hover:ring-red-500">
                <span className="text-sm font-medium text-white">{currentUser?.name?.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </button>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{currentUser?.role}</p>
          </div>
          <button onClick={handleLogout} className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;