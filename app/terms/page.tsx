import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Terms of <span className="gradient-text">Service</span>
          </h1>
          <div className="space-y-6 text-muted-foreground">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing and using GLOBAL NUMBER, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use our service.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. Service Description</h2>
              <p>GLOBAL NUMBER provides virtual phone numbers for receiving OTP verification codes from various online services. We do not guarantee OTP delivery for any specific number or service, as delivery depends on third-party providers and platforms.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Acceptable Use</h2>
              <p>You agree to use our service only for lawful purposes. You must not use virtual numbers for fraud, spam, harassment, impersonation, or any illegal activity. We reserve the right to suspend or ban accounts that violate these terms.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. Account Security</h2>
              <p>You are responsible for maintaining the security of your account credentials. We are not liable for unauthorized access to your account resulting from your failure to safeguard your login information.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Privacy</h2>
              <p>Your use of the service is also governed by our Privacy Policy. We do not share your personal information with third parties except as required by law.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
              <p>GLOBAL NUMBER is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use or inability to use the service, including but not limited to OTP delivery failures, service interruptions, or data loss.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">7. Refunds</h2>
              <p>Refunds are available for number purchases that do not receive an OTP within the polling window. Refunds are credited back to your wallet balance automatically.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">8. Changes to Terms</h2>
              <p>We reserve the right to modify these Terms of Service at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">9. Contact</h2>
              <p>For questions about these Terms, please reach out through our Telegram support channel.</p>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
