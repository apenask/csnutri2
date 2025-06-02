import bcrypt from 'bcryptjs';
import { User } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Modificado para aceitar isNewUser para validação de senha
export const validateUserData = (userData: Partial<Omit<User, 'id' | 'points'>>, isNewUser: boolean = false): string[] => {
  const errors: string[] = [];

  if (!userData.name?.trim()) {
    errors.push('Nome completo é obrigatório');
  }
  if (!userData.email?.trim()) {
    errors.push('Email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Email inválido');
  }
  if (!userData.username?.trim()) {
    errors.push('Nome de usuário é obrigatório');
  }
  
  // Senha é obrigatória apenas para novos usuários
  // Para edição, se o campo senha estiver vazio, significa que não se quer mudar a senha.
  if (isNewUser) {
    if (!userData.password?.trim()) {
      errors.push('Senha é obrigatória para novos usuários');
    } else if (userData.password.length < 6) {
      errors.push('A senha deve ter pelo menos 6 caracteres');
    }
  } else if (userData.password && userData.password.length > 0 && userData.password.length < 6) {
    // Se uma nova senha for fornecida na edição, ela deve ter o tamanho mínimo
    errors.push('A nova senha deve ter pelo menos 6 caracteres');
  }


  if (!userData.role) {
    errors.push('Tipo de usuário é obrigatório');
  }

  return errors;
};

// ... (formatUserData como antes, se ainda usar)