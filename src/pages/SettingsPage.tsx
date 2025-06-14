import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ConfirmationModal from '../components/ui/ConfirmationModal'; // Importado
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, UserPlus, DownloadCloud, Edit as EditIcon, Trash2 as TrashIcon, AlertTriangle } from 'lucide-react'; 
import { useTranslation } from 'react-i18next';
import { useUsers } from '../context/UserContext'; 
import UserForm from '../components/users/UserForm';
import { SiteSettings as SiteSettingsType, User as UserType } from '../types';
import { createBackup, restoreBackup } from '../utils/backup';

const defaultCompanySettings: SiteSettingsType = {
  companyName: 'CS Nutri',
  companyPhone: '(XX) XXXXX-XXXX',
  companyEmail: 'contato@csnutri.com',
  companyAddress: 'Endereço Padrão, 123',
};

const loadSettingsFromLocalStorage = (): SiteSettingsType => {
  const savedSiteSettings = localStorage.getItem('csNutriSiteSettings');
  if (savedSiteSettings) {
    try {
      const parsed = JSON.parse(savedSiteSettings) as SiteSettingsType;
      return {
        companyName: parsed.companyName || defaultCompanySettings.companyName,
        companyPhone: parsed.companyPhone || defaultCompanySettings.companyPhone,
        companyEmail: parsed.companyEmail || defaultCompanySettings.companyEmail,
        companyAddress: parsed.companyAddress || defaultCompanySettings.companyAddress,
      };
    } catch (e) {
      console.error("Erro ao carregar configurações do site do localStorage:", e);
      return defaultCompanySettings;
    }
  }
  return defaultCompanySettings;
};

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const { 
    users: userListFromContext, 
    addUser, 
    updateUser, 
    deleteUser 
  } = useUsers(); 

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const [companySettings, setCompanySettings] = useState<SiteSettingsType>(defaultCompanySettings);
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);

  // Estado para mensagens gerais da página (sucesso/erro)
  const [pageMessage, setPageMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Estados para modais de confirmação
  const [showDeleteUserConfirmModal, setShowDeleteUserConfirmModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [showRestoreBackupConfirmModal, setShowRestoreBackupConfirmModal] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);


  useEffect(() => {
    setCompanySettings(loadSettingsFromLocalStorage());
  }, []);

  // Efeito para limpar a mensagem da página após alguns segundos
  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 7000); // Aumentado para 7s para mensagens de backup
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const changeLanguage = useCallback((lng: string) => {
    i18n.changeLanguage(lng);
  }, [i18n]);

  const handleCompanySettingsInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveCompanySettings = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompanySettings(true);
    setPageMessage(null); 
    try {
      if(!companySettings.companyName.trim() || !companySettings.companyEmail.trim()){
          setPageMessage({type: 'error', text: 'Nome da empresa e Email são obrigatórios.'});
          setIsSavingCompanySettings(false);
          return;
      }
      localStorage.setItem('csNutriSiteSettings', JSON.stringify(companySettings)); 
      setPageMessage({type: 'success', text: 'Configurações da empresa salvas com sucesso!'});
    } catch (err) { 
      console.error('Erro ao salvar configurações da empresa:', err);
      setPageMessage({type: 'error', text: `Falha ao salvar configurações: ${err instanceof Error ? err.message : String(err)}`});
    } finally {
      setIsSavingCompanySettings(false);
    }
  }, [companySettings]);

  const clearUserModalMessages = useCallback(() => {
    setUserFormError(null);
  }, []);

  const handleOpenAddUserModal = useCallback(() => {
    setEditingUser(null);
    clearUserModalMessages();
    setPageMessage(null);
    setShowUserModal(true);
  }, [clearUserModalMessages]);
  
  const handleOpenEditUserModal = useCallback((user: UserType) => {
    setEditingUser(user);
    clearUserModalMessages();
    setPageMessage(null);
    setShowUserModal(true);
  }, [clearUserModalMessages]);

  const requestDeleteUser = (userId: string) => {
    setPageMessage(null);
    if (currentUser?.id === userId) { 
      setPageMessage({type: 'error', text: "Você não pode excluir a si mesmo."}); 
      return; 
    }
    const userToDelete = userListFromContext.find(u => u.id === userId);
    if (userToDelete && userToDelete.username === 'admin') { 
      setPageMessage({type: 'error', text: "Não é permitido excluir o usuário 'admin' principal."}); 
      return; 
    }
    setUserIdToDelete(userId);
    setShowDeleteUserConfirmModal(true);
  };

  const confirmDeleteUser = useCallback(async () => {
    if (!userIdToDelete) return;
    
    setIsSubmittingUser(true); 
    setPageMessage(null);
    try { 
        await deleteUser(userIdToDelete); 
        setPageMessage({type: 'success', text: 'Usuário excluído com sucesso!'}); 
    } catch (err) { 
        setPageMessage({type: 'error', text: `Erro ao excluir usuário: ${err instanceof Error ? err.message : String(err)}`});
    } 
    finally { 
      setIsSubmittingUser(false); 
      setShowDeleteUserConfirmModal(false);
      setUserIdToDelete(null);
    }
  }, [userIdToDelete, deleteUser, currentUser, userListFromContext]);

  const handleUserFormSubmit = useCallback(async (userData: Omit<UserType, 'id' | 'points'>) => {
    setIsSubmittingUser(true);
    setUserFormError(null); 
    setPageMessage(null);
    let successMessage = '';
    try {
      const dataToSubmit = { ...userData };
      if (editingUser) {
        if (!userData.password) { delete (dataToSubmit as Partial<UserType>).password; }
        await updateUser(editingUser.id, dataToSubmit);
        successMessage = 'Usuário atualizado com sucesso!';
      } else {
        if (!userData.password) { setUserFormError("Senha é obrigatória para novos usuários."); setIsSubmittingUser(false); return; }
        await addUser(dataToSubmit as Omit<UserType, 'id'>);
        successMessage = 'Usuário adicionado com sucesso!';
      }
      setPageMessage({type: 'success', text: successMessage});
      setShowUserModal(false);
      setEditingUser(null);
    } catch (errCaught) { 
      console.error("Erro ao salvar usuário:", errCaught);
      const errorTxt = errCaught instanceof Error ? errCaught.message : String(errCaught);
      setUserFormError(errorTxt); // Erro no modal
      setPageMessage({type: 'error', text: errorTxt}); // Erro na página
    } finally {
      setIsSubmittingUser(false);
    }
  }, [editingUser, addUser, updateUser]);

  const handleCreateBackup = async () => {
    setIsProcessingBackup(true);
    setPageMessage(null);
    try {
      await createBackup();
      setPageMessage({type: 'success', text: 'Backup gerado com sucesso e download iniciado!'});
    } catch (error) {
      console.error('Falha ao gerar backup:', error);
      setPageMessage({type: 'error', text: error instanceof Error ? error.message : 'Erro desconhecido ao gerar backup.'});
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleFileSelectedForRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToRestore(file);
      setShowRestoreBackupConfirmModal(true);
    }
     if (fileInputRef.current) { // Limpa o input para permitir selecionar o mesmo arquivo novamente
      fileInputRef.current.value = '';
    }
  };

  const confirmRestoreBackup = async () => {
    if (!fileToRestore) return;
    
    setIsProcessingBackup(true);
    setPageMessage(null);
    setShowRestoreBackupConfirmModal(false);

    try {
      await restoreBackup(fileToRestore);
      setPageMessage({type: 'success', text: 'Backup restaurado com sucesso! A aplicação será recarregada.'});
      setTimeout(() => { window.location.reload(); }, 2500); 
    } catch (error) {
      console.error('Falha ao restaurar backup:', error);
      setPageMessage({type: 'error', text: error instanceof Error ? error.message : 'Erro desconhecido ao restaurar backup.'});
    } finally {
      setIsProcessingBackup(false);
      setFileToRestore(null);
    }
  };


  if (!isAdmin) { 
    return ( <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-900"><div className="text-center"><h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h1><p className="text-gray-500 dark:text-gray-400">Você não tem permissão.</p></div></div> );
   }
  
  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">{t('settings')}</h1>
      
      {pageMessage && ( <div className={`mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ${pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}> {pageMessage.text} </div> )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('preferences')}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('site_theme')}</label>
              <div className="flex items-center">
                <Sun size={20} className="text-yellow-500 dark:text-yellow-400 mr-2" />
                <button type="button" onClick={toggleTheme} className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500 ${theme === 'dark' ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'}`} aria-pressed={theme === 'dark'} >
                  <span className="sr-only">Alternar tema</span>
                  <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <Moon size={20} className="text-indigo-500 dark:text-indigo-400 ml-2" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('current_theme', { theme: t(theme === 'light' ? 'theme_light' : 'theme_dark') })}</p>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('language')}</label>
              <select id="language-select" value={i18n.language.startsWith('pt') ? 'pt' : i18n.language} onChange={(e) => changeLanguage(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm">
                <option value="pt">{t('portuguese_br')}</option>
                <option value="en">{t('english_us')}</option>
              </select>
            </div>
          </div>
        </Card>
        
        <Card title="Configurações Gerais">
          <form onSubmit={handleSaveCompanySettings} className="space-y-4">
            <div><Input label={t('company_name')} type="text" id="companyName" name="companyName" value={companySettings.companyName} onChange={handleCompanySettingsInputChange} fullWidth /></div>
            <div><Input label="Telefone" type="tel" id="companyPhone" name="companyPhone" value={companySettings.companyPhone} onChange={handleCompanySettingsInputChange} fullWidth /></div>
            <div><Input label="Email" type="email" id="companyEmail" name="companyEmail" value={companySettings.companyEmail} onChange={handleCompanySettingsInputChange} fullWidth /></div>
            <div>
              <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
              <textarea id="companyAddress" name="companyAddress" rows={3} className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2" value={companySettings.companyAddress} onChange={handleCompanySettingsInputChange} />
            </div>
            <div className="pt-2"><Button type="submit" isLoading={isSavingCompanySettings} disabled={isSavingCompanySettings}>{isSavingCompanySettings ? 'Salvando...' : t('save_settings')}</Button></div>
          </form>
        </Card>
        
        <Card title="Gerenciamento de Usuários" className="lg:col-span-2" noPadding>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Button onClick={handleOpenAddUserModal} variant='outline' size="sm" disabled={isSubmittingUser}>
              <UserPlus size={16} className="mr-2" /> Adicionar Novo Usuário
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-700/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Usuário (Login)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {userListFromContext.map((user: UserType) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${ user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                       <Button variant="outline" size="sm" className="px-2 py-1" onClick={() => handleOpenEditUserModal(user)} disabled={isSubmittingUser}><EditIcon size={16}/></Button>
                       <Button variant="danger" size="sm" className="px-2 py-1" onClick={() => requestDeleteUser(user.id)} disabled={isSubmittingUser || currentUser?.id === user.id || user.username === 'admin'}><TrashIcon size={16}/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Backup e Restauração" className="lg:col-span-2">
            <div className="space-y-6">
                <div> <p className="text-sm text-gray-600 dark:text-gray-400 mb-4"> Faça backup dos dados do sistema para evitar perda de informações. Recomendamos fazer backups regularmente. </p> <Button variant="secondary" onClick={handleCreateBackup} disabled={isProcessingBackup} isLoading={isProcessingBackup}> <DownloadCloud size={16} className="mr-2"/> {isProcessingBackup ? 'Gerando...' : 'Gerar Backup'} </Button> </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4"> Restaure um backup anterior. Atenção: esta ação substituirá todos os dados atuais! </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Input type="file" id="restore-backup" className="flex-grow dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 dark:file:bg-red-500/20 file:text-red-700 dark:file:text-red-300 hover:file:bg-red-100 dark:hover:file:bg-red-600/30" accept=".zip" onChange={handleFileSelectedForRestore} ref={fileInputRef} disabled={isProcessingBackup} />
                    </div>
                </div>
            </div>
        </Card>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60 transition-opacity" onClick={() => {if(!isSubmittingUser) {setShowUserModal(false); setUserFormError(null); setEditingUser(null);}}}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4">
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
              {userFormError && ( <div className={`p-3 rounded-md text-sm mb-4 ${userFormError.toLowerCase().includes("sucesso") ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}> {userFormError} </div>)}
              <UserForm 
                key={editingUser ? editingUser.id : 'new-user-form'}
                onSubmit={handleUserFormSubmit} 
                initialData={editingUser || undefined} 
                submitLabel={editingUser ? 'Salvar Alterações' : 'Adicionar Usuário'}
                isLoading={isSubmittingUser}
                error={userFormError && !userFormError.toLowerCase().includes("sucesso") ? userFormError : null} 
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <Button type="button" variant="outline" onClick={() => {if(!isSubmittingUser) {setShowUserModal(false); setUserFormError(null); setEditingUser(null);}}} disabled={isSubmittingUser}>
                    Cancelar
                </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteUserConfirmModal}
        onClose={() => { 
            if(!isSubmittingUser) {
                setShowDeleteUserConfirmModal(false); 
                setUserIdToDelete(null);
            }
        }}
        onConfirm={confirmDeleteUser}
        title="Confirmar Exclusão de Usuário"
        message="Tem certeza que deseja excluir este usuário? Esta ação é irreversível."
        confirmButtonText="Excluir Usuário"
        confirmButtonVariant="danger"
        icon={TrashIcon}
        isSubmitting={isSubmittingUser}
      />

      <ConfirmationModal
        isOpen={showRestoreBackupConfirmModal}
        onClose={() => {
            if(!isProcessingBackup) {
                setShowRestoreBackupConfirmModal(false);
                setFileToRestore(null);
            }
        }}
        onConfirm={confirmRestoreBackup}
        title="Confirmar Restauração de Backup"
        message={fileToRestore ? `Tem certeza que deseja restaurar os dados do arquivo "${fileToRestore.name}"? TODOS OS DADOS ATUAIS SERÃO SUBSTITUÍDOS e a página será recarregada.` : "Confirmar restauração?"}
        confirmButtonText="Restaurar Backup"
        confirmButtonVariant="danger" // Ou 'primary' se preferir
        icon={AlertTriangle} // Ícone de alerta
        isSubmitting={isProcessingBackup}
      />

    </div>
  );
};

export default SettingsPage;
