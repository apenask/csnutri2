import React from 'react';
import Button from './Button'; 
import Card from './Card'; 

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  icon?: React.ElementType;
  isSubmitting?: boolean; // <-- NOVA PROPRIEDADE ADICIONADA
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  confirmButtonVariant = 'primary',
  icon: IconComponent,
  isSubmitting = false, // <-- VALOR PADRÃO
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isSubmitting) return; // Não faz nada se já estiver submetendo
    onConfirm();
    // onClose(); // O fechamento pode ser controlado pelo componente pai após a ação
  };

  const handleClose = () => {
    if (isSubmitting) return; // Não fecha se estiver submetendo
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60 transition-opacity" 
        onClick={handleClose} // Usa handleClose
      ></div>

      <Card className="relative z-10 w-full max-w-md shadow-xl !p-0 overflow-hidden">
        <div className="px-6 py-4">
            <div className="flex items-start">
                {IconComponent && (
                    <div className={`mr-3 flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                        confirmButtonVariant === 'danger' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
                    } sm:mx-0 sm:h-10 sm:w-10`}>
                        <IconComponent 
                            className={`h-6 w-6 ${confirmButtonVariant === 'danger' ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`} 
                            aria-hidden="true" 
                        />
                    </div>
                )}
                <div className="mt-0 text-left">
                    <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-gray-100" id="modal-title">
                        {title}
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                        {message}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
          <Button
            variant={confirmButtonVariant}
            onClick={handleConfirm} // Usa handleConfirm
            className="w-full sm:w-auto"
            isLoading={isSubmitting} // Passa para o botão interno
            disabled={isSubmitting}  // Desabilita se estiver submetendo
          >
            {confirmButtonText}
          </Button>
          <Button
            variant="outline"
            onClick={handleClose} // Usa handleClose
            className="w-full sm:w-auto mt-2 sm:mt-0"
            disabled={isSubmitting} // Desabilita se estiver submetendo
          >
            {cancelButtonText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;