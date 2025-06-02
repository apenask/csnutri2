import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteSettings } from '../types';

interface SiteSettingsContextType {
  settings: SiteSettings;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => void;
  isLoading: boolean;
}

const defaultSettings: SiteSettings = {
  companyName: 'CS Nutri',
  companyPhone: '(XX) XXXXX-XXXX',
  companyEmail: 'contato@csnutri.com',
  companyAddress: 'Endereço Padrão, 123',
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('csNutriSiteSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Se não houver nada salvo, salva as configurações padrão
        localStorage.setItem('csNutriSiteSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Falha ao carregar configurações do site do localStorage:', error);
      // Garante que as configurações padrão sejam definidas se houver erro e nada salvo
      if (!localStorage.getItem('csNutriSiteSettings')) {
        localStorage.setItem('csNutriSiteSettings', JSON.stringify(defaultSettings));
      }
    }
    setIsLoading(false);
  }, []);

  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      localStorage.setItem('csNutriSiteSettings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSiteSettings, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = (): SiteSettingsContextType => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings deve ser usado dentro de um SiteSettingsProvider');
  }
  return context;
};