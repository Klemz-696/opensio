'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  leftIcon?: React.ReactNode;
  showDefaultLeftIcon?: boolean;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      leftIcon,
      showDefaultLeftIcon = true,
      error,
      className = '',
      id,
      placeholder = '••••••••••••',
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    const hasLeftIcon = Boolean(leftIcon) || showDefaultLeftIcon;
    const resolvedLeftIcon = leftIcon || (showDefaultLeftIcon ? <Lock className="w-5 h-5" /> : null);

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {hasLeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              {resolvedLeftIcon}
            </div>
          )}

          <input
            {...props}
            ref={ref}
            id={id}
            type={showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            className={`w-full ${
              hasLeftIcon ? 'pl-11' : 'pl-3.5'
            } pr-11 py-2.5 bg-slate-50 dark:bg-slate-950/60 border ${
              error ? 'border-rose-500 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'
            } rounded-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-sm ${className}`}
          />

          <button
            type="button"
            onClick={toggleVisibility}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus:text-sky-500 dark:focus:text-sky-400"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Eye className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && (
          <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5">{error}</p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
