import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button'; // Usado
import Input from '../components/ui/Input'; // Usado
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
// Ícones: Camera e Link2 não são usados diretamente se o input file/url for o principal. UserIcon e TrashIcon são usados.
import { User as UserIcon, Trash2 as TrashIcon /*, Camera, Link2 */ } from 'lucide-react'; 
import { useTranslation } from 'react-i18next';
// UserType não é explicitamente anotado aqui, currentUser já vem tipado do AuthContext

// Função de simulação de upload
const simulateUpload = (file: File): Promise<string> => { // 'file' é usado aqui
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
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicUrlInput, setProfilePicUrlInput] = useState(currentUser?.profilePictureUrl || '');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(currentUser?.profilePictureUrl || null); // Usado para exibir a imagem
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // Usado para feedback
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false); // Usado nos botões
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false); // Usado nos botões
  const [isSubmittingPicture, setIsSubmittingPicture] = useState(false); // Usado nos botões

  const fileInputRef = useRef<HTMLInputElement>(null); // Usado

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      const picUrl = currentUser.profilePictureUrl || '';
      setProfilePicUrlInput(picUrl);
      setProfilePicPreview(picUrl);
    }
  }, [currentUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { // 'event' é usado
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

  const handleProfilePicUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => { // 'event' é usado
    const url = event.target.value; 
    setProfilePicUrlInput(url);
    setProfilePicPreview(url); 
    setProfilePicFile(null); 
  };

  const handleSaveProfilePicture = useCallback(async () => { // Usado no onClick do botão
    if (!currentUser) return;
    if (!profilePicFile && !profilePicUrlInput.trim()) {
      setMessage({ type: 'error', text: t('no_profile_picture_selected') });
      return;
    }
    
    setIsSubmittingPicture(true); // Usado
    setMessage(null); // Usado
    let newPictureUrl: string | undefined = undefined;

    try {
      if (profilePicFile) {
        newPictureUrl = await simulateUpload(profilePicFile); // simulateUpload é usado
      } else if (profilePicUrlInput.trim()) {
        newPictureUrl = profilePicUrlInput.trim();
      }
      
      await updateUserProfile(currentUser.id, { profilePictureUrl: newPictureUrl || '' });
      setMessage({ type: 'success', text: t('profile_picture_updated_success') });
      setProfilePicFile(null); 
    } catch (err) {
      setMessage({ type: 'error', text: `${t('profile_picture_upload_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsSubmittingPicture(false); // Usado
    }
  }, [currentUser, profilePicFile, profilePicUrlInput, t, updateUserProfile]);
  
  const handleRemoveProfilePicture = useCallback(async () => { // Usado no onClick do botão
    if (!currentUser) return;
    if (confirm(t('confirm_remove_picture'))) {
        setIsSubmittingPicture(true); // Usado
        setMessage(null); // Usado
        try {
            await updateUserProfile(currentUser.id, { profilePictureUrl: '' }); 
            setProfilePicPreview(null);
            setProfilePicUrlInput('');
            setProfilePicFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setMessage({ type: 'success', text: t('profile_picture_removed_success') });
        } catch (err) {
            setMessage({ type: 'error', text: `${t('profile_picture_remove_error')} ${err instanceof Error ? err.message : String(err)}` });
        } finally {
            setIsSubmittingPicture(false); // Usado
        }
    }
  }, [currentUser, updateUserProfile, t]);

  const handleProfileInfoUpdate = useCallback(async (e: React.FormEvent) => { // 'e' é usado; função usada no onSubmit do form
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim() || !username.trim()) { setMessage({ type: 'error', text: t('name_username_required') }); return; }
    setIsSubmittingProfile(true); setMessage(null); // Usados
    try {
      await updateUserProfile(currentUser.id, { name, username });
      setMessage({ type: 'success', text: t('profile_info_updated_success') });
    } catch (err) {
      setMessage({ type: 'error', text: `${t('profile_update_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally { setIsSubmittingProfile(false); } // Usado
  }, [currentUser, name, username, updateUserProfile, t]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => { // 'e' é usado; função usada no onSubmit do form
    e.preventDefault();
    if (!currentUser) return;
    if (!currentPassword || !newPassword || !confirmPassword) { setMessage({ type: 'error', text: t('all_password_fields_required')}); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: t('passwords_do_not_match') }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: t('password_min_length') }); return; }
    setIsSubmittingPassword(true); setMessage(null); // Usados
    try {
      await changeUserPassword(currentUser.id, currentPassword, newPassword);
      setCurrentPassword('');     // Usado
      setNewPassword('');         // Usado
      setConfirmPassword('');     // Usado
      setMessage({ type: 'success', text: t('password_changed_success') });
    } catch (err) {
      setMessage({ type: 'error', text: `${t('password_change_error')} ${err instanceof Error ? err.message : String(err)}` });
    } finally { setIsSubmittingPassword(false); } // Usado
  }, [currentUser, currentPassword, newPassword, confirmPassword, changeUserPassword, t]);


  if (!currentUser) { return <div className="p-4 dark:text-gray-300">{t('loading_profile')}</div>; }
  
  const titleStyle = theme === 'dark' ? 'text-red-400' : 'text-red-600';
  const accountInfoTitle = <span className={titleStyle}>{t('account_information')}</span>;
  const changePasswordTitle = <span className={titleStyle}>{t('change_password')}</span>;

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-50 mb-8">{t('profile')}</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md text-sm ${ message.type === 'success' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card> {/* Card da foto de perfil */}
            <div className="flex flex-col items-center p-2">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4 ring-4 ring-red-500/50 dark:ring-red-500/30">
                {profilePicPreview ? ( // Usado
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
                  <Button variant="danger" onClick={handleRemoveProfilePicture} disabled={isSubmittingPicture} className="flex-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400 -mb-2">{t('leave_fields_blank_to_not_change')}</p> {/* Ajustado margin-bottom */}
              <Input label={t('current_password')} type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth required={!!newPassword} /> {/* Senha atual só é obrigatória se for mudar a nova */}
              <Input label={t('new_password')} type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
              <Input label={t('confirm_new_password')} type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
              <Button type="submit" isLoading={isSubmittingPassword} disabled={isSubmittingPassword || (!currentPassword && !!newPassword) }> {/* Desabilita se nova senha for preenchida mas atual não */}
                {isSubmittingPassword ? t('changing_password_loading') : t('change_password_button')}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;