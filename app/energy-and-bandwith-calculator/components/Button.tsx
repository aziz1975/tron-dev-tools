import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  loadingText,
  disabled,
  className = '',
  variant = 'primary',
  fullWidth = true,
  ...props
}) => {
  const variantStyles = {
    primary: {
      backgroundColor: '#f44336', // red
      hover: '#d32f2f',
    },
    secondary: {
      backgroundColor: '#e57373', // light red
      hover: '#ef5350',
    },
  };

  return (
    // @ts-expect-error TS2339
    <MuiButton
      disabled={isLoading || disabled}
      className={className}
      fullWidth={fullWidth}
      variant="contained"
      color="inherit"
      style={{
        backgroundColor: variantStyles[variant]?.backgroundColor,
        '&:hover': {
          backgroundColor: variantStyles[variant]?.hover,
        },
        color: 'white',
      }}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center space-x-2">
          <CircularProgress size={20} color="inherit" />
          <span>{loadingText || 'Loading...'}</span>
        </span>
      ) : (
        children
      )}
    </MuiButton>
  );
};

export default Button;
