import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Globe, MessageCircle, Mail, Send } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Premium virtual phone numbers and OTP delivery service. Fast, reliable, and secure — serving 190+ countries worldwide.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">Services</Link></li>
              <li><Link href="/countries" className="text-muted-foreground hover:text-primary transition-colors">Countries</Link></li>
              <li><Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/support" className="text-muted-foreground hover:text-primary transition-colors">Support</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-4 w-4 text-primary" />
                <a href="https://t.me/SKYOTP_SKY" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Telegram Channel</a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-primary" />
                <a href="https://t.me/SKYOTP_SKY" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Support Group</a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 text-primary" />
                <span>190+ Countries</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GLOBAL NUMBER. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
