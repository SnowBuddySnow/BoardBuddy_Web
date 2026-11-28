import type { ReactNode } from 'react';
import { m, type HTMLMotionProps } from 'motion/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { springSnappy, tapPress } from '../lib/motion';

const buttonVariants = cva(
  // Colors transition in CSS; press/scale feedback is handled by motion (reduced-motion aware).
  'inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-navy text-white border-brand-navy hover:bg-brand-navy-deep hover:border-brand-navy-deep focus-visible:ring-brand-navy',
        secondary:
          'bg-brand-sun text-brand-navy border-brand-sun hover:bg-[#f7bd3a] hover:border-[#f7bd3a] focus-visible:ring-brand-sun',
        outline:
          'bg-white text-brand-navy border-zinc-300 hover:border-brand-navy hover:bg-brand-navy/5 focus-visible:ring-brand-navy',
        ghost:
          'bg-transparent text-zinc-700 border-transparent hover:bg-zinc-100 focus-visible:ring-zinc-300',
        danger:
          'bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#dc2626] hover:border-[#dc2626] focus-visible:ring-[#ef4444]',
      },
      size: {
        small: 'min-h-9 px-3 py-1.5 text-sm',
        medium: 'min-h-11 px-5 py-2.5 text-[15px]',
        large: 'min-h-12 px-6 py-3 text-base',
        icon: 'h-12 w-12 p-0',
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
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
  VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export const Button = ({
  className,
  variant,
  size,
  fullWidth,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <m.button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled}
      whileTap={disabled ? undefined : tapPress}
      transition={springSnappy}
      {...props}
    >
      {children}
    </m.button>
  );
};

export default Button;
