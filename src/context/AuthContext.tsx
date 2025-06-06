import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User as AppUser } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface CurrentUser extends Omit<AppUser, 'email'> {
  id: string;
  email?: string;
}

export interface AuthContextType {
  currentUser: CurrentUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUserProfile: (id: string, updatedData: { name?: string, profilePictureUrl?: string, username?: string }) => Promise<void>;
  changeUserPassword: (newPass: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const userMetadata = session.user.user_metadata;
          const user: CurrentUser = {
            id: session.user.id,
            email: session.user.email,
            name: userMetadata.name || 'Usuário',
            username: userMetadata.username || 'usuário',
            role: userMetadata.role || 'user',
            permissions: userMetadata.permissions || [],
            profilePictureUrl: userMetadata.profilePictureUrl || undefined,
            password: '', 
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase login error:', error.message);
      return { success: false, error: 'Email ou senha inválidos.' };
    }
    return { success: true, error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateUserProfile = async (id: string, updatedData: { name?: string, profilePictureUrl?: string, username?: string }) => {
      if (!id) throw new Error("ID do usuário é necessário.");
      const { data, error } = await supabase.auth.updateUser({
          data: { ...updatedData }
      });
      if (error) throw error;
      if (data.user) {
          setCurrentUser(prevUser => {
              if (!prevUser) return null;
              return {
                  ...prevUser,
                  name: data.user.user_metadata.name || prevUser.name,
                  username: data.user.user_metadata.username || prevUser.username,
                  profilePictureUrl: data.user.user_metadata.profilePictureUrl || prevUser.profilePictureUrl
              };
          });
      }
  };

  const changeUserPassword = async (newPass: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated,
    updateUserProfile,
    changeUserPassword,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};