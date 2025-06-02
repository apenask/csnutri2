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
  isSubmitting?: boolean;
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
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isSubmitting) return;
    onConfirm();
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60 transition-opacity" 
        onClick={handleClose}
      ></div>

      {/* Card do Modal */}
      <Card className="relative z-10 w-full max-w-md shadow-xl !p-0 overflow-hidden">
        {/* Conteúdo do Modal */}
        <div className="px-6 py-5 text-center"> 
            {IconComponent && (
                <div className={`mx-auto mb-4 flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                    confirmButtonVariant === 'danger' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
                }`}>
                    <IconComponent 
                        className={`h-6 w-6 ${confirmButtonVariant === 'danger' ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`} 
                        aria-hidden="true" 
                    />
                </div>
            )}
            {/* Bloco de Texto Centralizado */}
            <div className="mt-0">
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
        {/* Rodapé com Botões */}
        {/* Reduzido o gap para sm:gap-2 */}
        <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:justify-between sm:gap-2 gap-3"> 
          {/* A ordem no JSX define a ordem visual (Cancelar à esquerda, Confirmar à direita) com justify-between */}
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto mt-2 sm:mt-0" 
            disabled={isSubmitting}
          >
            {cancelButtonText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={handleConfirm}
            className="w-full sm:w-auto" 
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {confirmButtonText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;
