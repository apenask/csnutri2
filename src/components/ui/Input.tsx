import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className = '', icon, wrapperClassName = '', ...props }, ref) => {
    const baseInputClasses = `
      block shadow-sm 
      text-sm rounded-md
      transition duration-150 ease-in-out
    `;

    const themeClasses = `
      bg-white dark:bg-gray-700 
      border-gray-300 dark:border-gray-600 
      text-gray-900 dark:text-gray-100
      placeholder-gray-500 dark:placeholder-gray-400 
      focus:ring-2 focus:ring-red-500 focus:border-red-500
      dark:focus:ring-red-500 dark:focus:border-red-500 
    `;
    // Para o foco no modo escuro, podemos manter o anel vermelho ou usar um tom diferente se preferir.

    const errorClasses = `
      border-red-500 dark:border-red-400 
      text-red-700 dark:text-red-400 
      placeholder-red-400 dark:placeholder-red-500
      focus:ring-2 focus:ring-red-500 focus:border-red-500
      dark:focus:ring-red-400 dark:focus:border-red-400
    `;

    const inputClasses = `
      ${baseInputClasses}
      ${error ? errorClasses : themeClasses}
      ${icon ? 'pl-10' : 'px-3'} 
      py-2 
      ${fullWidth ? 'w-full' : ''}
      ${className} 
    `;

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
    const errorTextClasses = "mt-1 text-sm text-red-600 dark:text-red-500";

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
        {label && (
          <label htmlFor={props.id || props.name} className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative rounded-md"> {/* Removido shadow-sm daqui, já está no inputClasses */}
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {React.cloneElement(icon as React.ReactElement, { 
                className: `h-5 w-5 ${error ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}` 
              })}
            </div>
          )}
          <input
            ref={ref}
            id={props.id || props.name}
            className={inputClasses}
            {...props}
          />
        </div>
        {error && (
          <p className={errorTextClasses} id={`${props.id || props.name}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;