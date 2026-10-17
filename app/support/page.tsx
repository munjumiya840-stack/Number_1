import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import { Send, MessageCircle, Mail, Clock } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Get <span className="gradient-text">Support</span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              We're here to help. Reach out through any of the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <a
              href="https://t.me/SKYOTP_SKY"
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl border border-border/50 p-6 transition-all hover:border-primary/30 hover:glow-cyan group"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Telegram Channel</h3>
                  <p className="text-sm text-primary">@SKYOTP_SKY</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Join our Telegram channel for updates, new number announcements, and community discussions.
              </p>
            </a>

            <a
              href="https://t.me/SKYOTP_SKY"
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl border border-border/50 p-6 transition-all hover:border-primary/30 hover:glow-cyan group"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <MessageCircle className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Support Group</h3>
                  <p className="text-sm text-accent">@SKYOTP_SKY</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Get help from our team and community members in our Telegram support group.
              </p>
            </a>

            <div className="glass rounded-xl border border-border/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 border border-success/20">
                  <Clock className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Response Time</h3>
                  <p className="text-sm text-success">Usually within hours</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Our team monitors support channels regularly. Most questions are answered within a few hours.
              </p>
            </div>
          </div>

          <div className="mt-12 mx-auto max-w-2xl">
            <div className="glass rounded-xl border border-border/50 p-8 text-center">
              <Mail className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Have a specific issue?</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Include your account email, a description of the problem, and any relevant screenshots
                when reaching out. This helps us resolve your issue faster.
              </p>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
