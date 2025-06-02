import React from 'react';
// CORREÇÃO: Removido Outlet da importação, pois não é usado diretamente aqui
import { Navigate, useLocation } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; // Ajuste o caminho se necessário
// No futuro, importaremos a lista de navegação ou usaremos o contexto de usuário para permissões
// import { navigationItems } from '../layout/Sidebar'; 

interface ProtectedRouteProps {
  children: React.ReactNode; 
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // CORREÇÃO: Removido currentUser da desestruturação por enquanto
  const { isAuthenticated /*, currentUser*/ } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // LÓGICA DE PERMISSÃO (a ser implementada/refinada na Parte B da funcionalidade de permissões)
  // Por agora, se está autenticado, permite acesso ao children (que será o Layout)
  // Exemplo de lógica futura:
  // const currentNavItem = navigationItems.find(item => item.href === location.pathname);
  // if (currentUser?.role !== 'admin') {
  //   if (currentNavItem && !(currentUser?.permissions?.includes(currentNavItem.href))) {
  //      if (currentNavItem.href !== '/dashboard') { 
  //       return <Navigate to="/dashboard" replace />; 
  //     }
  //   }
  // } else if (!currentNavItem && location.pathname !== '/profile' && location.pathname !== '/') {
       // Se a rota não está na lista de navegação (e não é perfil), pode ser um acesso indevido para não-admin
       // return <Navigate to="/dashboard" replace />;
  // }


  return <>{children}</>;
};

export default ProtectedRoute;