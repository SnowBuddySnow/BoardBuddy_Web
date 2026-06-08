import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[#646cff] text-white border-[#646cff] hover:bg-[#535bf2] hover:border-[#535bf2] focus-visible:ring-[#646cff]',
        secondary:
          'bg-[#1a1a1a] text-[rgba(255,255,255,0.87)] border-[#1a1a1a] hover:bg-[#2a2a2a] hover:border-[#2a2a2a] focus-visible:ring-[#1a1a1a] dark:bg-[#f9f9f9] dark:text-[#213547] dark:border-[#f9f9f9] dark:hover:bg-[#e9e9e9] dark:hover:border-[#e9e9e9]',
        outline:
          'bg-transparent text-[#646cff] border-[#646cff] hover:bg-[#646cff] hover:text-white focus-visible:ring-[#646cff]',
        ghost:
          'bg-transparent text-[rgba(255,255,255,0.87)] border-transparent hover:bg-[rgba(255,255,255,0.1)] focus-visible:ring-[rgba(255,255,255,0.1)] dark:text-[#213547] dark:hover:bg-[rgba(0,0,0,0.05)]',
        danger:
          'bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#dc2626] hover:border-[#dc2626] focus-visible:ring-[#ef4444]',
      },
      size: {
        small: 'px-3 py-1.5 text-sm',
        medium: 'px-5 py-2.5 text-base',
        large: 'px-6 py-3 text-lg',
        icon: 'h-12 w-12 p-0', // Add this new size
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export const Button = ({
  className,
  variant,
  size,
  fullWidth,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;