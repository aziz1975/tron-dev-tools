import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  loadingText,
  disabled,
  className = '',
  variant = 'primary',
  ...props
}) => {
  const baseStyles = 'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200';
  const variantStyles = {
    primary: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    secondary: 'bg-red-500 hover:bg-red-600 focus:ring-red-400'
  };
  const disabledStyles = 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400';
  const focusStyles = 'focus:outline-none focus:ring-2 focus:ring-offset-2';

  return (
    <button
      disabled={isLoading || disabled}
      className={`${baseStyles} ${disabled || isLoading ? disabledStyles : variantStyles[variant]} ${focusStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="sm" className="text-white" />
          <span>{loadingText || 'Loading...'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
