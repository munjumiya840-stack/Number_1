import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn(
        'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 glow-cyan',
        iconSize
      )}>
        <Globe className="h-1/2 w-1/2 text-primary" />
        <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse-glow" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-wider gradient-text', textSize)} style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            GLOBAL
          </span>
          <span className={cn('font-bold tracking-[0.2em] text-muted-foreground', textSize === 'text-2xl' ? 'text-sm' : 'text-xs')}>
            NUMBER
          </span>
        </div>
      )}
    </div>
  );
}
