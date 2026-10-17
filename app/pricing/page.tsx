import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Info } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Transparent <span className="gradient-text">Pricing</span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Pay only for what you use. No hidden fees, no subscriptions required.
              Deposit funds to your wallet and purchase numbers as needed.
            </p>
          </div>

          <div className="mx-auto max-w-2xl mb-12">
            <div className="glass rounded-xl border border-primary/30 p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">How Pricing Works</h3>
                  <p className="text-sm text-muted-foreground">
                    Pricing is dynamic and depends on service, country, and number availability.
                    Each number purchase deducts from your wallet balance. You'll always see
                    the exact price before confirming a purchase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: 'Standard Numbers',
                price: 'Variable',
                desc: 'Range-based virtual numbers from our provider network.',
                features: [
                  'Dynamic pricing per country',
                  'Real-time availability',
                  '20-minute OTP polling',
                  'Free number changes',
                  '190+ countries supported',
                ],
              },
              {
                name: 'Premium Numbers',
                price: 'Variable',
                desc: 'Manual inventory numbers with guaranteed stock.',
                features: [
                  'Guaranteed availability',
                  'Priority OTP delivery',
                  'Configurable cooldown',
                  'Stock indicator display',
                  'Multiple numbers per request',
                ],
                highlighted: true,
              },
              {
                name: '2FA Code Generation',
                price: 'Free',
                desc: 'Generate TOTP codes from your 2FA secret keys.',
                features: [
                  'Live 6-digit codes',
                  'Auto-refresh every 30s',
                  'No number required',
                  'Unlimited usage',
                  'Works with any TOTP secret',
                ],
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? 'border-primary/40 bg-card/50 glow-cyan' : 'border-border/50 bg-card/50'}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold gradient-text">{plan.price}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Wallet deposits are credited instantly. Refunds are available for numbers
              that receive no OTP within the polling window.
            </p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
