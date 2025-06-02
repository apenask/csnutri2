import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'; // useContext é usado
import { User } from '../types';
// CORREÇÃO: Removida a importação de verifyPassword pois não é usada aqui
import { hashPassword, validateUserData } from '../utils/users';

interface UserContextType {
  users: User[];
  addUser: (userData: Omit<User, 'id' | 'points'>) => Promise<User>;
  updateUser: (id: string, userData: Partial<Omit<User, 'id' | 'points'>>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserById: (id: string) => User | undefined; // Renomeado de getUser para clareza e consistência
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUserPermissions = ['/dashboard', '/pos', '/products', '/customers']; 

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('csNutriUsers');
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers) as User[];
        return parsedUsers.map(user => ({
          ...user,
          points: user.points || 0, // Garante points
          permissions: user.permissions || (user.role === 'admin' ? undefined : defaultUserPermissions)
        }));
      } catch (error) {
        console.error('Falha ao carregar usuários salvos do localStorage:', error);
        return []; 
      }
    }
    // Se não houver usuários salvos, inicializa com um usuário admin padrão
    // apenas se a lista retornada acima for vazia.
    // É importante que este usuário admin inicial tenha uma senha já criptografada ou
    // que o processo de login inicial trate isso. Por simplicidade aqui, vamos assumir
    // que o login inicial do admin é tratado por mockData no AuthContext pela primeira vez.
    // Se não, você precisaria adicionar um usuário admin padrão aqui.
    return []; 
  });

  useEffect(() => {
    // Salva sempre que 'users' mudar, mesmo que seja para um array vazio
    localStorage.setItem('csNutriUsers', JSON.stringify(users));
  }, [users]);

  // A função saveUsers é redundante se o useEffect acima já faz o trabalho.
  // const saveUsers = (updatedUsers: User[]) => {
  //   setUsers(updatedUsers);
  //   // localStorage.setItem('csNutriUsers', JSON.stringify(updatedUsers)); // Feito pelo useEffect
  // };

  const addUser = async (userData: Omit<User, 'id' | 'points'>): Promise<User> => {
    const errors = validateUserData(userData, true); // true para novo usuário (senha obrigatória)
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    const existingUser = users.find(u => u.username === userData.username || u.email === userData.email);
    if (existingUser) {
      throw new Error('Nome de usuário ou email já cadastrado.');
    }

    if (!userData.password) { // Checagem extra, embora validateUserData deva pegar
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
    };

    setUsers(prevUsers => [...prevUsers, newUser]); // Atualiza o estado
    return newUser;
  };

  const updateUser = async (id: string, userData: Partial<Omit<User, 'id' | 'points'>>): Promise<User> => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado');
    }

    const currentUserData = users[userIndex];
    
    const errors = validateUserData(userData, false); // false para edição (senha não obrigatória)
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
      password: hashedPassword,
      permissions: userData.role === 'admin' ? undefined : (userData.permissions !== undefined ? userData.permissions : currentUserData.permissions),
    };
    // Se a senha não foi alterada no formulário de edição, não envie a propriedade password para userData
    if (userData.password === undefined || userData.password.trim() === '') {
        updatedUser.password = currentUserData.password; // Mantém a senha antiga se nenhuma nova foi fornecida
    }


    const updatedUsersList = users.map(u => u.id === id ? updatedUser : u);
    setUsers(updatedUsersList); // Atualiza o estado
    return updatedUser;
  };

  // CORREÇÃO: deleteUser é async e retorna Promise<void> (implicitamente)
  const deleteUser = async (id: string): Promise<void> => {
    const updatedUsers = users.filter(user => user.id !== id); // 'id' é usado aqui
    if (updatedUsers.length === users.length) {
      // Isso significa que o usuário não foi encontrado, embora a ação de deletar de uma lista filtrada
      // sempre resultará em um array menor ou igual. Melhor seria verificar se o usuário existe antes.
      // No entanto, para o propósito de remover da lista, se ele não estiver lá, a lista não muda.
      // Lançar um erro aqui se o usuário não for encontrado pode ser uma boa prática em alguns casos.
      // console.warn('Usuário não encontrado para exclusão, ou já excluído.');
    }
    setUsers(updatedUsers); // Atualiza o estado
  };

  // CORREÇÃO: getUserById é uma função normal e retorna User | undefined. 'id' é usado.
  const getUserById = (id: string): User | undefined => {
    return users.find(user => user.id === id); // 'id' é usado aqui
  };

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser, getUserById }}>
      {children}
    </UserContext.Provider>
  );
};

// CORREÇÃO: useUsers retorna UserContextType e usa useContext
export const useUsers = (): UserContextType => {
  const context = useContext(UserContext); // useContext é usado aqui
  if (context === undefined) {
    throw new Error('useUsers deve ser usado dentro de um UserProvider');
  }
  return context;
};

