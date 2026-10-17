'use client';

import { useCategories } from '@/hooks/use-categories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, Check } from 'lucide-react';
import Link from 'next/link';
import { getCountryFlag } from '@/lib/constants';

export default function ServicesPage() {
  const { categories, loading } = useCategories();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Our Services
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose from our dynamically managed service categories
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Services are being configured. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className="group border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:glow-cyan"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/30">
                    {cat.logo_url ? (
                      <img src={cat.logo_url} alt={cat.display_name} className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
                    {cat.display_name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {cat.description || 'No description available.'}
                  </p>

                  {cat.reward_per_otp > 0 && (
                    <Badge className="mt-3 bg-success/10 text-success border-success/20">
                      Earn ${cat.reward_per_otp.toFixed(2)} per OTP
                    </Badge>
                  )}

                  {(cat.country_availability || []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {(cat.country_availability || []).slice(0, 8).map(code => (
                        <span key={code} className="text-lg" title={code}>
                          {getCountryFlag(code)}
                        </span>
                      ))}
                      {(cat.country_availability || []).length > 8 && (
                        <span className="text-xs text-muted-foreground">
                          +{(cat.country_availability || []).length - 8} more
                        </span>
                      )}
                    </div>
                  )}

                  <Link href="/register" className="mt-4 block">
                    <Button className="w-full" variant="outline">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
