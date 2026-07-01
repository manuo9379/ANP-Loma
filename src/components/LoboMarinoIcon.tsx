import React from 'react';

interface LoboMarinoIconProps {
  className?: string;
}

export default function LoboMarinoIcon({ className = "w-6 h-6" }: LoboMarinoIconProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* High-fidelity vector silhouette of a South American Sea Lion (Lobo Marino de 1 Pelo) */}
      <path 
        d="M 12 11 
           C 11 9, 8.5 10, 8 13.5 
           C 7 17, 6.2 23, 5 31 
           C 3.8 39, 4.2 48, 6.2 56 
           C 7.5 61, 10 67, 11 71.5 
           C 9.5 72.5, 7 72.5, 5.5 73 
           C 5.5 74.5, 6.5 76, 8.5 77.5 
           C 10 78.5, 12.5 78.5, 15 78 
           C 17 81, 17 83, 18.5 86 
           C 20 88.5, 23 89, 26.5 89.5 
           C 28 89, 29.5 88, 31 86.5 
           C 33 85, 35 83, 38 81.5 
           C 44 81, 51 80, 58 78.5 
           C 65 77, 72 75, 79 73.5 
           C 83 73, 87 75, 91.5 77.5 
           C 93.5 78.5, 95.5 77.5, 95.5 76.5 
           C 95 75.5, 93 74, 91 73 
           C 88.5 71.5, 85 70, 80.5 68 
           C 74 65.5, 67.5 63, 60.5 60 
           C 50.5 55.5, 41.5 50, 34 42.5 
           C 28 36.5, 24.5 29.5, 22.5 21.5 
           C 21.5 17.5, 19.5 14.5, 17 12.5 
           C 15 11, 13.5 11.2, 12 11 Z"
      />
    </svg>
  );
}
