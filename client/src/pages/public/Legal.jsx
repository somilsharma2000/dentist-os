import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardContent, PageHeader } from '../../components/ui';

const fallback = {
  clinicName: 'Dental Clinic', address: '', phone: '', email: '',
  billingProfile: {}, legalProfile: {}
};

function LegalShell({ title, eyebrow, children, settings }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageHeader title={title} subtitle={`${eyebrow} · Please review the clinic-specific details before publishing.`} />
      <div className="mt-8 space-y-6">{children}</div>
      <p className="mt-10 text-xs text-muted-foreground">Last updated: {settings?.legalProfile?.policyEffectiveDate || 'Clinic configuration required'} · Policy version: {settings?.legalProfile?.privacyNoticeVersion || 'Draft'}</p>
    </div>
  );
}

const Section = ({ title, children }) => <Card><CardContent className="prose prose-sm max-w-none p-6 text-foreground"><h2 className="mt-0 text-lg font-semibold">{title}</h2>{children}</CardContent></Card>;

export default function Legal() {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState(fallback);
  useEffect(() => { api.get('/settings').then((data) => setSettings({ ...fallback, ...data })).catch(() => {}); }, []);
  const clinic = settings.clinicName || 'the clinic';
  const contact = settings.email || settings.legalProfile?.grievanceEmail || 'the clinic contact shown on this website';
  const address = settings.address || settings.billingProfile?.registeredAddress || 'the clinic address shown on this website';

  if (pathname === '/terms') return <LegalShell title="Terms of Use" eyebrow="Draft clinic terms" settings={settings}>
    <Section title="Using this website"><p>This website helps patients learn about {clinic}, request appointments, contact the clinic, and use the patient portal. An appointment request is not confirmed until the clinic confirms it.</p><p>Do not use the website or portal for an emergency. Call local emergency services or attend the nearest emergency department.</p></Section>
    <Section title="Appointments and payments"><p>The clinic will communicate its appointment, cancellation, no-show, treatment, payment, refund, and invoice terms before they apply. Prices and availability may change and should be confirmed with the clinic.</p></Section>
    <Section title="Patient content and portal security"><p>Keep portal codes confidential and notify the clinic if you suspect unauthorised access. You must provide accurate information and must not misuse the portal, submit another person’s information without authority, or upload unlawful content.</p></Section>
    <Section title="Clinic responsibility"><p>The clinic—not Dentist OS—is responsible for clinical decisions, treatment, medical records, professional licensing, and patient care. Online information is general information and is not a diagnosis or treatment plan.</p></Section>
    <Section title="Contact and disputes"><p>Questions about care or these terms should be sent to {contact} or the clinic address: {address}. The clinic should replace this draft with lawyer-approved terms, governing-law language, and any applicable dispute process before launch.</p></Section>
  </LegalShell>;

  if (pathname === '/grievance') return <LegalShell title="Privacy and Grievance Contact" eyebrow="Patient support" settings={settings}>
    <Section title="Contact the clinic"><p>For privacy questions, consent withdrawal, record requests, corrections, or complaints, contact:</p><p className="not-prose rounded-md bg-muted p-4"><strong>{settings.legalProfile?.grievanceOfficerName || 'Grievance officer not configured'}</strong><br />{settings.legalProfile?.grievanceEmail || contact}<br />{settings.legalProfile?.grievancePhone || settings.phone || 'Phone not configured'}<br />{address}</p></Section>
    <Section title="Submit a data request"><p>Use the <Link className="text-primary underline" to="/data-rights">data rights request form</Link>. The clinic may verify your identity before disclosing, correcting, or deleting information.</p></Section>
    <Section title="How complaints are handled"><p>The clinic should acknowledge complaints, record the decision, explain any refusal or retention requirement, and provide an escalation route. This page is a configurable product template and must be completed with the clinic’s approved process.</p></Section>
  </LegalShell>;

  if (pathname === '/cookies') return <LegalShell title="Cookie and Analytics Notice" eyebrow="Website technology notice" settings={settings}>
    <Section title="Current use"><p>This deployment does not intentionally use advertising pixels, session replay, or non-essential analytics in the patient portal. The demo deployment may use browser local storage to preserve demo data.</p></Section>
    <Section title="Necessary storage"><p>Authentication, security, language, and demo-mode storage may be necessary for the website to function. Clinic operators must update this notice if they add analytics, marketing tags, payment tools, or other tracking technologies.</p></Section>
    <Section title="Changes"><p>Any non-essential analytics or tracking should be documented, disclosed, and configured only after the clinic approves the applicable consent and privacy process.</p></Section>
  </LegalShell>;

  if (pathname === '/consent') return <LegalShell title="Consent and Patient Information" eyebrow="Clinic consent information" settings={settings}>
    <Section title="Service communications"><p>The clinic may use the information you provide to manage appointments, provide requested care, issue invoices, respond to support requests, and send essential service communications. The booking screen records the notice version and your service-consent decision.</p></Section>
    <Section title="Optional marketing communications"><p>Marketing messages are optional and separate from service consent. You can withdraw marketing consent or reply STOP to supported WhatsApp messages. Withdrawing marketing consent does not cancel care or essential appointment messages.</p></Section>
    <Section title="Clinical consent"><p>Appointment booking and this website do not replace informed consent for examination, treatment, photographs, imaging, anaesthesia, procedures, minors, or teleconsultation. The treating clinic must obtain and store the appropriate clinical consent before treatment.</p></Section>
    <Section title="Your choices"><p>You can request access, correction, consent withdrawal, deletion where legally permitted, or raise a grievance through the <Link className="text-primary underline" to="/data-rights">data rights request form</Link>.</p></Section>
  </LegalShell>;

  return <LegalShell title="Privacy Notice" eyebrow="Draft clinic privacy notice" settings={settings}>
    <Section title="Who is responsible"><p>{clinic} is responsible for the patient-care relationship and the personal data collected through this website and clinic operations. The clinic’s legal name, address, grievance contact, and policy version must be completed in Admin → Settings before publication.</p><p>Contact: {contact}<br />Address: {address}</p></Section>
    <Section title="Information we use"><p>Depending on how you interact with the clinic, this may include your name, phone, email, appointment information, dental and health information, invoices, consent records, communications, device/security logs, and information needed to prevent abuse.</p></Section>
    <Section title="Why we use it"><p>We use information to respond to requests, schedule and provide care, maintain records, issue invoices, send essential service communications, support the patient portal, prevent fraud, meet legal obligations, and—only where separately enabled—send marketing communications.</p></Section>
    <Section title="Service providers"><p>The clinic may use hosting, backup, WhatsApp Cloud API, SMS/OTP, support, and other providers configured under Admin → Integrations. The clinic should publish its approved subprocessor list and hosting/cross-border details before launch.</p></Section>
    <Section title="Retention and rights"><p>Records are retained according to the clinic’s approved clinical, tax, security, and legal retention schedule. You may request access, correction, consent withdrawal, deletion where permitted, or raise a grievance using the <Link className="text-primary underline" to="/data-rights">data rights request form</Link>.</p></Section>
    <Section title="Security and changes"><p>We use access controls, tenant separation, rate limits, consent controls, and security monitoring. No online service is risk-free. The clinic will update this notice when its processing changes and should publish the approved effective date and version.</p></Section>
  </LegalShell>;
}
