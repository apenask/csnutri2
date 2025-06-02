import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { User } from '../../types';
import { navigationItems } from '../layout/Sidebar'; // Importando para as permissões

export interface UserFormProps {
  onSubmit: (userData: Omit<User, 'id' | 'points'>) => Promise<void>; // userData não deve ter id ou points
  initialData?: Partial<User>; // Usar Partial<User> aqui
  submitLabel?: string;
  isLoading?: boolean; // Adicionada para controlar o estado de carregamento do botão
  error?: string | null; // Adicionada para exibir erros de submissão
}

const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  initialData, // Não precisa de valor padrão {}, useEffect cuida disso
  submitLabel = 'Salvar',
  isLoading = false,
  error: submitError // Renomeado para evitar conflito com estado local 'formError'
}) => {
  const [formData, setFormData] = useState<Omit<User, 'id' | 'points'>>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'user',
    permissions: initialData?.role === 'admin' ? undefined : (initialData?.permissions || [])
  });
  const [formError, setFormError] = useState<string>(''); // Para erros de validação do formulário

  useEffect(() => {
    setFormData({
      name: initialData?.name || '',
      email: initialData?.email || '',
      username: initialData?.username || '',
      password: '', // Senha sempre limpa ao popular para edição ou novo
      role: initialData?.role || 'user',
      permissions: initialData?.role === 'admin' ? undefined : (initialData?.permissions || []),
    });
    setFormError(''); // Limpa erros locais ao popular
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permissionHref: string) => {
    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      if (currentPermissions.includes(permissionHref)) {
        return { ...prev, permissions: currentPermissions.filter(p => p !== permissionHref) };
      } else {
        return { ...prev, permissions: [...currentPermissions, permissionHref] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); 

    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      setFormError("Nome, nome de usuário e email são obrigatórios.");
      return;
    }
    if (!initialData?.id && !formData.password) { 
      setFormError("Senha é obrigatória para novos usuários.");
      return;
    }
    if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
      setFormError("A (nova) senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    const dataToSubmit = { 
        ...formData,
        // Se for admin, as permissões granulares não se aplicam no objeto User (ele tem todas)
        // O UserContext pode tratar permissions como undefined para admin
        permissions: formData.role === 'admin' ? undefined : formData.permissions 
    };
    
    // Se for edição e a senha não foi alterada (campo password está vazio)
    // removemos a propriedade password para não sobrescrever a senha hashada existente com uma vazia.
    if (initialData?.id && !formData.password) {
        delete (dataToSubmit as Partial<User>).password;
    }

    await onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="bg-red-100 dark:bg-red-800/30 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300 p-3 mb-4 rounded-md">
          <p className="text-sm">{submitError}</p>
        </div>
      )}
       {formError && (
        <div className="bg-red-100 dark:bg-red-800/30 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300 p-3 mb-4 rounded-md">
          <p className="text-sm">{formError}</p>
        </div>
      )}

      <Input label="Nome Completo" type="text" name="name" value={formData.name} onChange={handleInputChange} required fullWidth />
      <Input label="Email" type="email" name="email" value={formData.email} onChange={handleInputChange} required fullWidth />
      <Input label="Nome de Usuário (login)" type="text" name="username" value={formData.username} onChange={handleInputChange} required fullWidth />
      <Input 
        label="Senha" 
        type="password" 
        name="password" 
        value={formData.password} 
        onChange={handleInputChange} 
        required={!initialData?.id} 
        placeholder={initialData?.id ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
        fullWidth 
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário</label>
        <select name="role" value={formData.role} onChange={handleInputChange} required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm">
          <option value="user">Usuário</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {formData.role === 'user' && (
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissões de Acesso às Abas:</label>
          <div className="space-y-2 max-h-48 overflow-y-auto p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/30">
            {navigationItems.map(perm => (
              (perm.href !== '/settings') && ( 
                <label key={perm.href} className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-red-600 border-gray-300 dark:border-gray-500 dark:bg-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800"
                    checked={(formData.permissions || []).includes(perm.href)}
                    onChange={() => handlePermissionChange(perm.href)}
                  />
                  <span>{perm.name}</span>
                </label>
              )
            ))}
          </div>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Admins têm acesso a todas as abas. Defina aqui para usuários 'user'.</p>
        </div>
      )}

      <div className="pt-4">
        <Button type="submit" fullWidth isLoading={isLoading}>
            {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;