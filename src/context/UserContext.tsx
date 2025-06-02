import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { hashPassword, validateUserData } from '../utils/users';
import { users as mockUsers } from '../data/mockData'; // Importar os usuários mock

interface UserContextType {
  users: User[];
  addUser: (userData: Omit<User, 'id' | 'points'>) => Promise<User>;
  updateUser: (id: string, userData: Partial<Omit<User, 'id' | 'points'>>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  isLoading: boolean; // Adicionado isLoading
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUserPermissions = ['/dashboard', '/pos', '/products', '/customers']; 

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Estado de carregamento

  useEffect(() => {
    const initializeUsers = async () => {
      let loadedUsers: User[] = [];
      const savedUsers = localStorage.getItem('csNutriUsers');

      if (savedUsers) {
        try {
          const parsedUsers = JSON.parse(savedUsers) as User[];
          // Garante que os usuários carregados tenham as propriedades esperadas
          loadedUsers = parsedUsers.map(user => ({
            ...user,
            points: user.points || 0,
            permissions: user.permissions || (user.role === 'admin' ? undefined : defaultUserPermissions)
          }));
        } catch (error) {
          console.error('Falha ao carregar usuários salvos do localStorage:', error);
          // Se o parse falhar, tentaremos inicializar com mocks
        }
      }

      // Se não há usuários salvos (ou o parse falhou e loadedUsers está vazio)
      // E mockUsers existe e tem usuários
      if (loadedUsers.length === 0 && mockUsers && mockUsers.length > 0) {
        console.log('Inicializando usuários a partir de mockData...');
        try {
          const usersWithHashedPasswords = await Promise.all(
            mockUsers.map(async (mockUser) => {
              // Verifica se a senha já parece ser um hash (contém '$') ou se é uma senha mock simples
              // Idealmente, mockData não teria senhas em texto plano, mas se tiver, hasheamos.
              let hashedPassword = mockUser.password;
              if (mockUser.password && !mockUser.password.startsWith('$2a$') && !mockUser.password.startsWith('$2b$')) {
                 // Supõe que senhas mock simples precisam ser hasheadas
                hashedPassword = await hashPassword(mockUser.password);
              }
              return {
                ...mockUser,
                password: hashedPassword,
                points: mockUser.points || 0,
                permissions: mockUser.role === 'admin' ? undefined : (mockUser.permissions || defaultUserPermissions),
              };
            })
          );
          loadedUsers = usersWithHashedPasswords;
          localStorage.setItem('csNutriUsers', JSON.stringify(loadedUsers));
          console.log('Usuários mock inicializados e salvos no localStorage.');
        } catch (hashError) {
          console.error('Erro ao hashear senhas dos usuários mock:', hashError);
          // Se o hash falhar, loadedUsers permanecerá vazio ou com o que foi parseado antes (se houve)
        }
      }
      
      setUsers(loadedUsers);
      setIsLoading(false);
    };

    initializeUsers();
  }, []); // Executa apenas uma vez na montagem

  useEffect(() => {
    // Salva sempre que 'users' mudar, mas apenas se não estiver carregando
    if (!isLoading) {
      localStorage.setItem('csNutriUsers', JSON.stringify(users));
    }
  }, [users, isLoading]);

  const addUser = async (userData: Omit<User, 'id' | 'points'>): Promise<User> => {
    const errors = validateUserData(userData, true);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    const existingUser = users.find(u => u.username === userData.username || u.email === userData.email);
    if (existingUser) {
      throw new Error('Nome de usuário ou email já cadastrado.');
    }

    if (!userData.password) {
        throw new Error('Senha é obrigatória para novos usuários.');
    }
    const hashedPassword = await hashPassword(userData.password);
    
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      points: 0, 
      permissions: userData.role === 'admin' ? undefined : (userData.permissions || defaultUserPermissions),
      profilePictureUrl: userData.profilePictureUrl, // Adicionado
    };

    setUsers(prevUsers => [...prevUsers, newUser]);
    return newUser;
  };

  const updateUser = async (id: string, userData: Partial<Omit<User, 'id' | 'points'>>): Promise<User> => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado');
    }

    const currentUserData = users[userIndex];
    
    const errors = validateUserData(userData, false); 
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
    if (userData.username && users.some(u => u.id !== id && u.username === userData.username)) {
        throw new Error('Nome de usuário já em uso por outro usuário.');
    }
    if (userData.email && users.some(u => u.id !== id && u.email === userData.email)) {
        throw new Error('Email já em uso por outro usuário.');
    }

    let hashedPassword = currentUserData.password;
    if (userData.password && userData.password.trim() !== '') {
      hashedPassword = await hashPassword(userData.password);
    }

    const updatedUser: User = {
      ...currentUserData,
      ...userData,
      password: hashedPassword, // Senha atualizada ou mantida
      permissions: userData.role === 'admin' ? undefined : (userData.permissions !== undefined ? userData.permissions : currentUserData.permissions),
      // profilePictureUrl é atualizado se presente em userData
    };
    
    if (userData.password === undefined || userData.password.trim() === '') {
        updatedUser.password = currentUserData.password; 
    }

    const updatedUsersList = users.map(u => u.id === id ? updatedUser : u);
    setUsers(updatedUsersList);
    return updatedUser;
  };

  const deleteUser = async (id: string): Promise<void> => {
    const updatedUsers = users.filter(user => user.id !== id);
    setUsers(updatedUsers);
  };

  const getUserById = (id: string): User | undefined => {
    return users.find(user => user.id === id);
  };

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser, getUserById, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers deve ser usado dentro de um UserProvider');
  }
  return context;
};
