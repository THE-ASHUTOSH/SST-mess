// LoadingSpinner.tsx
"use client"
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-[#1a1d2e] z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="relative">
        <div className={`${sizeClasses[size]} relative`}>
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-blue-500 animate-spin"></div>
          
          {/* Inner spinning ring */}
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-400 border-l-indigo-400 animate-spin-reverse"></div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
