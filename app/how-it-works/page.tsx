import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus, LayoutGrid, Globe, MessageSquare, Clock, KeyRound, FileDown, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    { icon: UserPlus, title: '1. Create Your Account', desc: 'Sign up with your email address. It takes less than a minute to get started. No credit card required.' },
    { icon: LayoutGrid, title: '2. Choose a Service', desc: 'Select from Facebook, WhatsApp, Instagram, or New FB. Each service has numbers available across multiple countries.' },
    { icon: Globe, title: '3. Select a Country', desc: 'Pick a specific country from our 190+ supported locations, or choose "Any Country" to get the first available number.' },
    { icon: MessageSquare, title: '4. Receive Your Number', desc: 'Your virtual phone number is displayed instantly. Use it on the target platform to receive the verification code.' },
    { icon: Clock, title: '5. Wait for OTP', desc: 'Our system continuously polls for incoming messages. Your OTP code appears the moment it arrives — typically within 30 seconds.' },
    { icon: ArrowRight, title: '6. Change If Needed', desc: 'If no OTP arrives within 20 minutes, the number is returned automatically. You can request a new number at no extra charge.' },
  ];

  const features = [
    { icon: KeyRound, title: '2FA Code Generation', desc: 'Have a TOTP secret key? Use our Get 2FA feature to generate live 6-digit authentication codes that refresh every 30 seconds. Perfect for two-factor authentication without a phone.' },
    { icon: FileDown, title: 'OTP History Export', desc: 'Export your last 24 hours of OTP history as a CSV file. Keep records of all your verification codes with timestamps and service details.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              How It <span className="gradient-text">Works</span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              From sign-up to OTP delivery in under two minutes. Here's the complete workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="glass rounded-xl border border-border/50 p-6 transition-all hover:border-primary/20">
                <step.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Additional <span className="gradient-text">Features</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {features.map((feat) => (
                <div key={feat.title} className="glass rounded-xl border border-border/50 p-6">
                  <feat.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
