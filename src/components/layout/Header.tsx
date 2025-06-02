import React from 'react';
// import { useAuth } from '../../context/AuthContext'; // Não é mais necessário se removermos o menu do usuário daqui
import { Menu, Bell } from 'lucide-react'; // Removido User e LogOut se não forem mais usados aqui
// import { useNavigate } from 'react-router-dom'; // Não é mais necessário se removermos a navegação do perfil daqui

interface HeaderProps {
  openSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  // const { currentUser, logout } = useAuth(); // Removido se não usado
  // const navigate = useNavigate(); // Removido se não usado
  // const [showUserMenu, setShowUserMenu] = React.useState(false); // Removido

  // const handleLogout = () => { // Removido se o logout for apenas pela sidebar
  //   logout();
  // };

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow dark:border-b dark:border-gray-700">
      <button
        type="button"
        className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 md:hidden"
        onClick={openSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          {/* Espaço para possível título ou busca no futuro, se necessário */}
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <button
            type="button"
            className="bg-white dark:bg-gray-800 p-1 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profile dropdown REMOVIDO */}
          {/* <div className="ml-3 relative">
            <div>
              <button
                type="button"
                className="max-w-xs bg-white dark:bg-gray-800 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500"
                id="user-menu-button"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {currentUser?.name ? (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  )}
                </div>
              </button>
            </div>
            
            {showUserMenu && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigate('/profile'); setShowUserMenu(false); }}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  role="menuitem"
                >
                  Perfil
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleLogout(); setShowUserMenu(false); }}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </div>
                </a>
              </div>
            )}
          </div> 
          */}
        </div>
      </div>
    </header>
  );
};

export default Header;
