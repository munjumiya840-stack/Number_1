import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import { COUNTRY_NAMES, getCountryFlag } from '@/lib/constants';
import { Globe } from 'lucide-react';

export default function CountriesPage() {
  const countries = Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Supported <span className="gradient-text">Countries</span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              We offer virtual phone numbers from over 190 countries worldwide.
              Availability may vary by service — check the dashboard for real-time status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {countries.map(([code, name]) => (
              <div
                key={code}
                className="glass flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 transition-all hover:border-primary/20"
              >
                <span className="text-2xl">{getCountryFlag(code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{code}</p>
                </div>
                <Globe className="h-4 w-4 text-primary/40" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
