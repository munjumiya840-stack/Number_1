'use client';

import { useEffect, useState } from 'react';
import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FAQS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Phone, Globe, Zap, Shield, Clock, ArrowRight, CheckCircle2, KeyRound, MessageSquare, BarChart3, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Category } from '@/lib/types';

export default function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'active')
        .order('sort_order', { ascending: true });
      if (data) setCategories(data as Category[]);
      setCatLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0 radial-glow" />
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live OTP delivery across 190+ countries
            </div>

            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Virtual Numbers for<br />
              <span className="gradient-text">Instant OTP Verification</span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Get temporary phone numbers and receive OTP codes from Facebook, WhatsApp,
              Instagram, and more. Fast delivery, global coverage, and enterprise-grade security.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats / Features preview */}
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Globe, label: 'Countries', value: '190+' },
              { icon: Zap, label: 'Avg Delivery', value: '< 30s' },
              { icon: Phone, label: 'Services', value: `${categories.length || 4}+` },
              { icon: Shield, label: 'Encrypted', value: '100%' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl border border-border/50 p-4 text-center">
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Supported <span className="gradient-text">Services</span>
            </h2>
            <p className="text-muted-foreground">Receive OTP codes from the platforms you need</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {catLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : categories.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-12">Services are being configured. Check back soon.</p>
            ) : categories.map((cat) => (
              <Card key={cat.id} className="group relative overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:glow-cyan">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                      {cat.logo_url ? (
                        <img src={cat.logo_url} alt={cat.display_name} className="h-full w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{cat.display_name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{cat.description || ''}</p>
                  {cat.reward_per_otp > 0 && (
                    <p className="mt-2 text-xs font-medium text-success">Earn ${cat.reward_per_otp.toFixed(2)}/OTP</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Why <span className="gradient-text">GLOBAL NUMBER</span>
            </h2>
            <p className="text-muted-foreground">Built for speed, security, and reliability</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: 'Lightning Fast', desc: 'Our system continuously polls for incoming messages and delivers OTP codes within seconds of arrival.' },
              { icon: Globe, title: 'Global Coverage', desc: 'Virtual numbers from 190+ countries. Choose by country or let us find the best available number for you.' },
              { icon: Shield, title: 'Secure & Private', desc: 'OTP codes are only visible to you. We use encrypted connections and never share your data with third parties.' },
              { icon: KeyRound, title: '2FA Code Generation', desc: 'Generate live TOTP codes from your 2FA secret keys. Codes refresh every 30 seconds automatically.' },
              { icon: Clock, title: '20-Minute Window', desc: 'Each number is held for 20 minutes while we poll for your OTP. Change numbers anytime during that window.' },
              { icon: BarChart3, title: 'Real-Time Stats', desc: 'Track your OTP history, success rates, and top countries through an intuitive dashboard interface.' },
            ].map((feat) => (
              <div key={feat.title} className="glass rounded-xl border border-border/50 p-6 transition-all hover:border-primary/20">
                <feat.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works preview */}
      <section className="relative py-20 border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              { step: '01', icon: CheckCircle2, title: 'Create Account', desc: 'Sign up for free with your email address.' },
              { step: '02', icon: Phone, title: 'Select Service', desc: 'Choose from Facebook, WhatsApp, Instagram, and more.' },
              { step: '03', icon: Globe, title: 'Pick Country', desc: 'Select a country or let us find any available number.' },
              { step: '04', icon: MessageSquare, title: 'Receive OTP', desc: 'Get your code instantly and complete verification.' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary/30" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>{item.step}</span>
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/how-it-works">
              <Button variant="outline">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="relative py-20 border-t border-border/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.slice(0, 4).map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="glass rounded-lg border border-border/50 px-4">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 text-center">
            <Link href="/faq">
              <Button variant="outline">View All FAQs <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 border-t border-border/30">
        <div className="absolute inset-0 radial-glow" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Ready to Get <span className="gradient-text">Started?</span>
          </h2>
          <p className="mb-8 text-muted-foreground">
            Create your free account and get your first virtual number in minutes.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
