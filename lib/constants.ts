export const COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra',
  AO: 'Angola', AR: 'Argentina', AM: 'Armenia', AU: 'Australia',
  AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh',
  BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin',
  BT: 'Bhutan', BO: 'Bolivia', BA: 'Bosnia', BW: 'Botswana',
  BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso',
  BI: 'Burundi', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CV: 'Cape Verde', CF: 'Central African Rep.', TD: 'Chad',
  CL: 'Chile', CN: 'China', CO: 'Colombia', KM: 'Comoros',
  CG: 'Congo', CR: 'Costa Rica', CI: 'Côte d\'Ivoire', HR: 'Croatia',
  CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark',
  DJ: 'Djibouti', DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt',
  SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia',
  DE: 'Germany', GH: 'Ghana', GR: 'Greece', GT: 'Guatemala',
  GN: 'Guinea', GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti',
  HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary', IS: 'Iceland',
  IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica',
  JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya',
  KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan',
  LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho',
  LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania',
  LU: 'Luxembourg', MO: 'Macao', MK: 'N. Macedonia', MG: 'Madagascar',
  MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico',
  MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia', ME: 'Montenegro',
  MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia',
  NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PS: 'Palestine', PA: 'Panama', PG: 'Papua New Guinea',
  PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland',
  PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RU: 'Russia',
  RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
  SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia',
  SI: 'Slovenia', SO: 'Somalia', ZA: 'South Africa', ES: 'Spain',
  LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname', SZ: 'Swaziland',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan',
  TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste',
  TG: 'Togo', TO: 'Tonga', TN: 'Tunisia', TR: 'Turkey',
  TM: 'Turkmenistan', TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine',
  AE: 'UAE', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
  UZ: 'Uzbekistan', VU: 'Vanuatu', VE: 'Venezuela', VN: 'Vietnam',
  YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

export function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => c.charCodeAt(0) + 127397));
}

export const SERVICES = [
  { id: 'FACEBOOK', name: 'Facebook', icon: '📘', color: '#1877F2', description: 'Receive OTP codes for Facebook accounts, pages, andMessenger verification.' },
  { id: 'WHATSAPP', name: 'WhatsApp', icon: '💬', color: '#25D366', description: 'Get WhatsApp verification codes instantly for any country.' },
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📸', color: '#E4405F', description: 'Instagram OTP verification for account creation and login.' },
  { id: 'NEW FB', name: 'New FB', icon: '🔷', color: '#00D9FF', description: 'Fresh Facebook number ranges for new account registration.' },
];

export const FAQS = [
  {
    q: 'What is GLOBAL NUMBER?',
    a: 'GLOBAL NUMBER is a premium virtual phone number platform that lets you receive OTP verification codes from services like Facebook, WhatsApp, Instagram, and more — without using your personal phone number.',
  },
  {
    q: 'How fast will I receive my OTP code?',
    a: 'OTP codes are typically delivered within seconds to a few minutes. Our system continuously polls for incoming messages and notifies you the moment a code arrives.',
  },
  {
    q: 'Which countries are supported?',
    a: 'We support over 190 countries with both range-based and manual inventory numbers. Availability may vary by service and country — check the dashboard for real-time availability.',
  },
  {
    q: 'Can I use the same number for multiple services?',
    a: 'Each number is assigned for a specific service. Once a number is assigned to you, it is held for 20 minutes while we poll for your OTP. You can request a different number during that window.',
  },
  {
    q: 'Is my account secure?',
    a: 'Yes. We use industry-standard encryption for all data transmission. OTP codes are only visible to the account owner and authorized administrators. We never share your information with third parties.',
  },
  {
    q: 'What happens if no OTP arrives?',
    a: 'If no OTP is received within the 20-minute window, the number is automatically returned to the pool. You can then request a new number at no additional charge.',
  },
  {
    q: 'Do you offer 2FA code generation?',
    a: 'Yes. If you have a 2FA secret key (TOTP), you can use our Get 2FA feature to generate live 6-digit authentication codes that refresh every 30 seconds.',
  },
  {
    q: 'How do I get support?',
    a: 'You can reach us through our Telegram support channel or group. Visit the Support page for links and contact information.',
  },
];
