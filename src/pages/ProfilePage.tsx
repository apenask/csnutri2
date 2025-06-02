import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button'; 
import Input from '../components/ui/Input'; 
import ConfirmationModal from '../components/ui/ConfirmationModal'; // Importado
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User as UserIcon, Trash2 as TrashIcon } from 'lucide-react'; 
import { useTranslation } from 'react-i18next';

// Função de simulação de upload
const simulateUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string); 
        } else {
          reject(new Error("Falha ao ler o arquivo (reader.result é nulo)."));
        }
      };
      reader.onerror = (error) => reject(error || new Error("Erro desconhecido no FileReader."));
      reader.readAsDataURL(file); 
    }, 1000);
  });
};

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, changeUserPassword } = useAuth();
  const { theme } = useTheme(); // theme não está sendo usado diretamente para estilização aqui, mas pode ser mantido
  const { t } = useTranslation();

  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicUrlInput, setProfilePicUrlInput] = useState(currentUser?.profilePictureUrl || '');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(currentUser?.profilePictureUrl || null);
  
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingPicture, setIsSubmittingPicture] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para o modal de confirmação de remoção de foto
  const [showRemovePicConfirmModal, setShowRemovePicConfirmModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      const picUrl = currentUser.profilePictureUrl || '';
      setProfilePicUrlInput(picUrl);
      setProfilePicPreview(picUrl);
    }
  }, [currentUser]);

  // Efeito para limpar a mensagem da página após alguns segundos
  useEffect(() => {
    if (pageMessage) {
      const timer = setTimeout(() => setPageMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageMessage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; 
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setProfilePicUrlInput(''); 
    }
  };

  const handleProfilePicUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value; 
    setProfilePicUrlInput(url);
    setProfilePicPreview(url); 
    setProfilePicFile(null); 
  };

  const handleSaveProfilePicture = useCallback(async () => {
    if (!currentUser) return;
    if (!profilePicFile && !profilePicUrlInput.trim()) {
      setPageMessage({ type: 'error', text: t('no_profile_picture_selected') });
      return;
    }
    
    setIsSubmittingPicture(true); 
    setPageMessage(null); 
    let newPictureUrl: string | undefined = undefined;

    try {
      if (profilePicFile) {
        newPictureUrl = await simulateUpload(profilePicFile); 
      } else if (profilePicUrlInput.trim()) {
        newPictureUrl = profilePicUrlInput.trim();
      }
      
      await updateUserProfile(currentUser.id, { profilePictureUrl: newPictureUrl || '' });
      setPageMessage({ type: 'success', text: t('profile_picture_updated_success') });
      setProfilePicFile(null); 
    } catch (err) {
      setPageMessage({ type: 'error', text: `${t('profile_picture_upload_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsSubmittingPicture(false); 
    }
  }, [currentUser, profilePicFile, profilePicUrlInput, t, updateUserProfile]);
  
  const requestRemoveProfilePicture = () => {
    setPageMessage(null);
    setShowRemovePicConfirmModal(true);
  };

  const confirmRemoveProfilePicture = useCallback(async () => { 
    if (!currentUser) return;
    
    setIsSubmittingPicture(true); 
    setPageMessage(null);
    setShowRemovePicConfirmModal(false); // Fecha o modal ao iniciar a ação
    try {
        await updateUserProfile(currentUser.id, { profilePictureUrl: '' }); 
        setProfilePicPreview(null);
        setProfilePicUrlInput('');
        setProfilePicFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setPageMessage({ type: 'success', text: t('profile_picture_removed_success') });
    } catch (err) {
        setPageMessage({ type: 'error', text: `${t('profile_picture_remove_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally {
        setIsSubmittingPicture(false); 
    }
  }, [currentUser, updateUserProfile, t]);

  const handleProfileInfoUpdate = useCallback(async (e: React.FormEvent) => { 
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim() || !username.trim()) { setPageMessage({ type: 'error', text: t('name_username_required') }); return; }
    setIsSubmittingProfile(true); setPageMessage(null); 
    try {
      await updateUserProfile(currentUser.id, { name, username });
      setPageMessage({ type: 'success', text: t('profile_info_updated_success') });
    } catch (err) {
      setPageMessage({ type: 'error', text: `${t('profile_update_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally { setIsSubmittingProfile(false); } 
  }, [currentUser, name, username, updateUserProfile, t]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => { 
    e.preventDefault();
    if (!currentUser) return;
    if (!currentPassword || !newPassword || !confirmPassword) { setPageMessage({ type: 'error', text: t('all_password_fields_required')}); return; }
    if (newPassword !== confirmPassword) { setPageMessage({ type: 'error', text: t('passwords_do_not_match') }); return; }
    if (newPassword.length < 6) { setPageMessage({ type: 'error', text: t('password_min_length') }); return; }
    setIsSubmittingPassword(true); setPageMessage(null); 
    try {
      await changeUserPassword(currentUser.id, currentPassword, newPassword);
      setCurrentPassword('');     
      setNewPassword('');         
      setConfirmPassword('');     
      setPageMessage({ type: 'success', text: t('password_changed_success') });
    } catch (err) {
      setPageMessage({ type: 'error', text: `${t('password_change_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally { setIsSubmittingPassword(false); } 
  }, [currentUser, currentPassword, newPassword, confirmPassword, changeUserPassword, t]);


  if (!currentUser) { return <div className="p-4 dark:text-gray-300">{t('loading_profile')}</div>; }
  
  const titleStyle = theme === 'dark' ? 'text-red-400' : 'text-red-600';
  const accountInfoTitle = <span className={titleStyle}>{t('account_information')}</span>;
  const changePasswordTitle = <span className={titleStyle}>{t('change_password')}</span>;

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-8">{t('profile')}</h1>
      
      {pageMessage && (
        <div className={`mb-6 p-4 rounded-md text-sm ${ pageMessage.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {pageMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card> 
            <div className="flex flex-col items-center p-2">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4 ring-4 ring-red-500/50 dark:ring-red-500/30">
                {profilePicPreview ? ( 
                  <img src={profilePicPreview} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-20 h-20 sm:w-24 sm:h-24 text-gray-400 dark:text-gray-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{username}</p>
              <p className={`mt-2 px-3 py-0.5 text-xs font-semibold rounded-full ${currentUser.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                {currentUser.role === 'admin' ? t('administrator') : t('user')}
              </p>
            </div>
          </Card>

          <Card title={t('profile_picture')}>
            <div className="space-y-4">
              <div>
                <label htmlFor="upload-image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('upload_new_picture')}</label>
                <Input type="file" id="upload-image" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="mt-1 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 dark:file:bg-red-500/20 file:text-red-700 dark:file:text-red-300 hover:file:bg-red-100 dark:hover:file:bg-red-600/30" />
              </div>
              <div>
                <label htmlFor="image-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('or_enter_image_url')}</label>
                <Input type="url" id="image-url" name="profilePicUrlInput" placeholder="https://..." value={profilePicUrlInput} onChange={handleProfilePicUrlChange} className="mt-1" />
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Button onClick={handleSaveProfilePicture} disabled={isSubmittingPicture || (!profilePicFile && !profilePicUrlInput.trim())} isLoading={isSubmittingPicture} className="flex-1">
                  {isSubmittingPicture ? t('uploading') : t('save_picture')}
                </Button>
                {(profilePicPreview || currentUser.profilePictureUrl) && (
                  <Button variant="danger" onClick={requestRemoveProfilePicture} disabled={isSubmittingPicture} className="flex-1">
                    <TrashIcon size={16} className="mr-2"/> {t('remove_picture')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <Card title={accountInfoTitle}>
            <form onSubmit={handleProfileInfoUpdate} className="space-y-4">
              <div><Input label={t('full_name')} type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth /></div>
              <div><Input label={t('username_login')} type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required fullWidth /></div>
              <div className="pt-2"><Button type="submit" isLoading={isSubmittingProfile} disabled={isSubmittingProfile}>{isSubmittingProfile ? t('saving_changes') : t('save_profile_info')}</Button></div>
            </form>
          </Card>

          <Card title={changePasswordTitle}>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 -mb-2">{t('leave_fields_blank_to_not_change')}</p>
              <Input label={t('current_password')} type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth required={!!newPassword} />
              <Input label={t('new_password')} type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
              <Input label={t('confirm_new_password')} type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
              <Button type="submit" isLoading={isSubmittingPassword} disabled={isSubmittingPassword || (!currentPassword && !!newPassword) }>
                {isSubmittingPassword ? t('changing_password_loading') : t('change_password_button')}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showRemovePicConfirmModal}
        onClose={() => {
            if(!isSubmittingPicture) { // Só permite fechar se não estiver submetendo
                setShowRemovePicConfirmModal(false);
            }
        }}
        onConfirm={confirmRemoveProfilePicture}
        title={t('confirm_remove_picture_title') || "Confirmar Remoção da Foto"} // Adicionar tradução para o título
        message={t('confirm_remove_picture') || "Tem certeza que deseja remover sua foto de perfil?"}
        confirmButtonText={t('remove_picture_confirm_button') || "Remover Foto"} // Adicionar tradução
        confirmButtonVariant="danger"
        icon={TrashIcon}
        isSubmitting={isSubmittingPicture}
      />
    </div>
  );
};

export default ProfilePage;
