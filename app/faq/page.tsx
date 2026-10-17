import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';
import { FAQS } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight } from 'lucide-react';

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 p-3">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
              Frequently Asked <span className="gradient-text">Questions</span>
            </h1>
            <p className="text-muted-foreground">Everything you need to know about GLOBAL NUMBER</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.map((faq, i) => (
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

          <div className="mt-12 rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <p className="mb-4 text-muted-foreground">Still have questions?</p>
            <Link href="/support">
              <Button variant="outline">
                Contact Support
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
