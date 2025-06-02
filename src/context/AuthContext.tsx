import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { verifyPassword, hashPassword as utilHashPassword } from '../utils/users';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserProfile: (id: string, updatedData: Partial<Omit<User, 'id' | 'password' | 'points'>>) => Promise<void>;
  changeUserPassword: (id: string, oldPass: string, newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('csNutriUser');
    if (savedUser) {
      try {
        const parsedUser: User = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Falha ao carregar usuário salvo:', error);
        localStorage.removeItem('csNutriUser');
      }
    }
  }, []);

  const login = useCallback(async (username: string, passwordToVerify: string): Promise<boolean> => {
    const savedUsersData = localStorage.getItem('csNutriUsers');
    const allUsers: User[] = savedUsersData ? JSON.parse(savedUsersData) : [];
    const userInDb = allUsers.find(u => u.username === username);

    if (userInDb && typeof userInDb === 'object' && userInDb.password) { // Verifica se userInDb é um objeto
      const isPasswordMatch = await verifyPassword(passwordToVerify, userInDb.password);
      if (isPasswordMatch) {
        const userToAuthData: Partial<User> = { ...userInDb }; 
        delete userToAuthData.password; 
        
        setCurrentUser(userToAuthData as User); 
        setIsAuthenticated(true);
        localStorage.setItem('csNutriUser', JSON.stringify(userToAuthData));
        return true;
      }
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('csNutriUser');
  }, []);

  const updateUserProfile = useCallback(async (id: string, updatedData: Partial<Omit<User, 'id' | 'password' | 'points'>>) => {
    const savedUsersData = localStorage.getItem('csNutriUsers');
    let allUsers: User[] = savedUsersData ? JSON.parse(savedUsersData) : [];
    let userToUpdateGlobally: User | undefined = undefined;

    const updatedUsersList = allUsers.map(u => {
      if (u.id === id) {
        userToUpdateGlobally = { 
            ...u, 
            ...updatedData, 
            password: u.password 
        };
        return userToUpdateGlobally;
      }
      return u;
    });

    if (userToUpdateGlobally && typeof userToUpdateGlobally === 'object') { // Guarda adicional
      localStorage.setItem('csNutriUsers', JSON.stringify(updatedUsersList));
      
      if (currentUser?.id === id) {
        // CORREÇÃO REFORÇADA AQUI (sua linha 81 ou próxima)
        const userForAuthContext: Partial<User> = {};
        // Copia todas as propriedades de userToUpdateGlobally, exceto 'password'
        for (const key in userToUpdateGlobally as Record<string, unknown>) {
          if (key !== 'password' && Object.prototype.hasOwnProperty.call(userToUpdateGlobally, key)) {
            (userForAuthContext as any)[key] = (userToUpdateGlobally as any)[key];
          }
        }
        
        setCurrentUser(userForAuthContext as User);
        localStorage.setItem('csNutriUser', JSON.stringify(userForAuthContext));
      }
    } else {
      throw new Error("Usuário não encontrado para atualizar ou 'userToUpdateGlobally' não é um objeto.");
    }
  }, [currentUser]);

  const changeUserPassword = useCallback(async (id: string, oldPass: string, newPass: string) => {
    const savedUsersData = localStorage.getItem('csNutriUsers');
    let allUsers: User[] = savedUsersData ? JSON.parse(savedUsersData) : [];
    const userIndex = allUsers.findIndex(u => u.id === id);

    if (userIndex === -1) throw new Error("Usuário não encontrado.");
    
    const userInDb = allUsers[userIndex];
    if (typeof userInDb !== 'object' || !userInDb) { // Verificação adicional
        throw new Error("Dados de usuário inválidos no banco de dados.");
    }
    const isOldPasswordMatch = await verifyPassword(oldPass, userInDb.password);

    if (!isOldPasswordMatch) throw new Error("Senha atual incorreta.");
    
    const hashedNewPassword = await utilHashPassword(newPass);

    const updatedUserWithNewPassword = { ...userInDb, password: hashedNewPassword };
    allUsers[userIndex] = updatedUserWithNewPassword;
    localStorage.setItem('csNutriUsers', JSON.stringify(allUsers));

    if (currentUser?.id === id) {
        const userToAuthData: Partial<User> = {};
        for (const key in updatedUserWithNewPassword) {
          if (key !== 'password' && Object.prototype.hasOwnProperty.call(updatedUserWithNewPassword, key)) {
            (userToAuthData as any)[key] = (updatedUserWithNewPassword as any)[key];
          }
        }
        
        setCurrentUser(userToAuthData as User); 
        localStorage.setItem('csNutriUser', JSON.stringify(userToAuthData));
    }
  }, [currentUser]);


  const value = { currentUser, login, logout, isAuthenticated, updateUserProfile, changeUserPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};