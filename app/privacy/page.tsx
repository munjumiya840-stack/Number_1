import { PublicNavbar } from '@/components/brand/public-navbar';
import { PublicFooter } from '@/components/brand/public-footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <div className="space-y-6 text-muted-foreground">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information We Collect</h2>
              <p>We collect your email address, account creation date, and transaction history. When you use the service, we also log OTP codes, phone numbers used, and service selections for functionality and support purposes.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
              <p>Your information is used to provide the service, process transactions, maintain account security, communicate service updates, and provide support. We do not sell or rent your personal information to third parties.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">3. Data Security</h2>
              <p>We use industry-standard encryption for data transmission. OTP codes and phone numbers are treated as sensitive information and are only accessible to you and authorized administrators. Access to your data is restricted and logged.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">4. OTP Data Retention</h2>
              <p>OTP success logs older than 30 days may be automatically purged to minimize data retention. You may also export your recent OTP history at any time through the dashboard.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">5. Third-Party Services</h2>
              <p>We use third-party providers for virtual number delivery. These providers may have their own privacy policies. We do not share your personal account information with these providers beyond what is necessary to deliver the service.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">6. Cookies and Sessions</h2>
              <p>We use authentication cookies to maintain your login session. These cookies are HTTP-only and secure. We do not use tracking cookies for advertising purposes.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">7. Your Rights</h2>
              <p>You have the right to access your data, request deletion of your account, and export your information. Contact us through our support channels to exercise these rights.</p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">8. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the service or our communication channels.</p>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
