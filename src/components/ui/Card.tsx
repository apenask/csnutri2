import React from 'react';

interface CardProps {
  title?: React.ReactNode; // MODIFICADO: de string para React.ReactNode
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  transparentDarkBg?: boolean; 
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  footer,
  headerAction,
  noPadding = false,
  transparentDarkBg = false, 
}) => {
  const paddingClasses = noPadding ? '' : 'px-4 py-5 sm:p-6';
  const bgClasses = transparentDarkBg 
    ? 'bg-white dark:bg-transparent'
    : 'bg-white dark:bg-gray-800';

  return (
    <div className={`${bgClasses} rounded-lg shadow-md dark:shadow-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          {/* Agora o título pode ser um elemento React, então não precisa de <h3> aqui se já for um */}
          {typeof title === 'string' ? (
            <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-700 dark:text-gray-200">{title}</h3>
          ) : (
            title // Renderiza o ReactNode diretamente
          )}
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      )}
      <div className={paddingClasses}> 
        {children}
      </div>
      {footer && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-800 dark:border-t dark:border-gray-700"> 
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;