# Dentist OS — legal and compliance gap audit

**Audit date:** 6 September 2026  
**Jurisdiction assumed:** India  
**Important:** This is a product/compliance gap assessment, not legal advice. A clinic operator and an Indian lawyer/chartered accountant must approve the final wording, retention periods, tax treatment, contracts, and operating procedures before production use.

## Executive finding

The application contains important technical privacy controls: tenant isolation, versioned booking consent, separate service/marketing consent, consent-aware WhatsApp sending, STOP opt-out handling, OTP throttling, secret masking, and webhook verification.

It is **not legally launch-ready as a public patient service** because the repository currently has no reviewed public Privacy Notice, Terms of Use, clinic Data Processing Agreement, cookie/analytics disclosure, patient rights workflow, grievance contact, data-retention schedule, breach-response procedure, subprocessor register, or formal medical-record export/retention process.

## What is implemented in software

- Public booking requires a service-consent flag and a policy version.
- Optional marketing consent is stored separately.
- Consent records are append-only application records and are linked to the patient/appointment.
- WhatsApp utility and marketing messages use different consent scopes.
- WhatsApp STOP/unsubscribe messages create a marketing withdrawal record.
- Messages without consent are blocked.
- Tenant records are scoped by clinic.
- OTP requests and verification attempts are rate limited.
- Internal clinical notes are excluded from the patient portal payload.
- Connector secrets are masked in API responses.
- Signed WhatsApp webhook verification is implemented.

These controls help with compliance but do not replace notices, contracts, records of processing, governance, or legal review.

## Missing documents and operating controls

### 1. Public Privacy Notice — mandatory before patient launch

Publish a linked Privacy Notice on the public website and booking/portal screens. It should identify, in plain language:

- the clinic/legal entity acting as the data fiduciary/controller;
- the clinic address and contact details;
- the privacy/grievance contact and escalation route;
- what data is collected: identity, phone, email, appointment, dental/health information, invoices, consent records, device/IP/security logs;
- purposes and lawful/notice basis for each purpose;
- required service communications versus optional marketing;
- WhatsApp, SMS/OTP, hosting, backup, email, analytics, and support providers;
- where data is hosted and any cross-border processing;
- retention/deletion rules;
- patient rights and how to request access, correction, erasure, withdrawal, or grievance handling;
- child/minor handling and parent/guardian consent;
- security limitations and breach-contact process;
- policy version and effective date.

The notice must not claim that Dentist OS is the medical provider if the clinic is the provider.

### 2. Terms of Use / Website Terms

Needed for the public website and patient portal. Cover appointment requests, cancellation/no-show policy, portal access, acceptable use, content/reviews, limitations of online booking, emergency disclaimer, intellectual property, governing law, contact details, and dispute handling.

### 3. Clinic–Dentist OS Data Processing Agreement

Needed if Dentist OS operates as the clinic's processor/service provider. It should cover:

- roles and instructions;
- permitted processing;
- confidentiality and staff access;
- security measures;
- breach notification and cooperation;
- subprocessors and provider changes;
- cross-border transfers;
- audit/support obligations;
- retention and secure deletion/return at termination;
- patient-rights request assistance;
- clinic ownership/control of patient records;
- liability, indemnity, insurance, and limitation clauses.

### 4. Consent and patient-rights procedure

The product needs an operating procedure and preferably UI/API support for:

- patient access/copy requests;
- correction requests;
- consent withdrawal;
- marketing opt-out;
- deletion/erasure requests, subject to clinical/tax retention duties;
- identity verification;
- response deadlines and escalation;
- immutable request/audit history.

Currently, consent capture exists but a formal data-subject request workflow does not.

### 5. Retention and deletion schedule

A clinic-approved schedule is missing. It must be set by counsel/clinic policy for:

- clinical records and treatment plans;
- invoices and tax records;
- consent records;
- WhatsApp/SMS messages and delivery logs;
- OTP/security logs;
- public booking leads;
- reviews and contact messages;
- backups;
- terminated clinic accounts.

Do not use a generic “delete everything after X days” rule for medical and tax records without legal/accounting review.

### 6. Security incident and breach-response plan

Create a written plan naming responsible people and contacts. Include detection, containment, evidence preservation, clinic notification, patient communication, regulator/law-enforcement coordination, recovery, and post-incident review.

CERT-In directions should be reviewed for applicable incident reporting and log-retention obligations. The production operator must know who can report an incident within the required time window.

### 7. Subprocessor register

Maintain a public or contract-linked list of providers, for example:

- hosting provider;
- Meta/WhatsApp Cloud API;
- MSG91;
- SMS/DLT provider;
- email provider, if added;
- backup/storage provider;
- monitoring/error tracking, if added;
- analytics/cookie providers, if added.

Record purpose, data categories, country/region, security terms, and change-notice process.

### 8. Cookie and analytics notice

No cookie/analytics policy was found. If analytics, advertising pixels, session replay, or non-essential cookies are added, disclose them and obtain any required consent before activation. Do not add tracking to the patient portal without a documented necessity/legal basis.

### 9. Medical and professional practice documents

The clinic, not the software, must provide and approve:

- patient registration/intake notice;
- medical/dental history consent;
- treatment consent forms;
- minor/guardian consent;
- imaging/photo consent;
- teleconsultation consent, if teleconsultation is offered;
- emergency disclaimer and escalation instructions;
- record correction/amendment process;
- record release/export process;
- dentist licensing and professional-disclosure details.

Dentist OS should not claim that appointment reminders or portal content constitute diagnosis, treatment, or emergency medical advice.

### 10. GST, invoicing, and commercial documents

The invoice module is not a substitute for tax compliance. A CA should confirm:

- clinic GST registration and applicability;
- correct tax rates and service classification;
- GSTIN, legal name, address, invoice numbering, date, place of supply, tax breakup, and required particulars;
- credit notes/refunds and cancellation handling;
- e-invoicing applicability and IRN/QR requirements where applicable;
- payment gateway settlement and reconciliation;
- SaaS invoices issued by Dentist OS to clinics;
- commercial subscription terms and refund policy.

### 11. Vendor and employment documents

The operator should have confidentiality/IP and acceptable-use agreements for staff, contractors, support personnel, and developers who can access production data. Access should be removed on departure and logged.

### 12. Marketing and messaging compliance

Before marketing WhatsApp/SMS:

- keep separate service and marketing consent;
- show sender identity and opt-out instructions;
- use only approved Meta templates where required;
- maintain suppression/opt-out lists;
- do not re-add opted-out recipients without a fresh valid opt-in;
- document DLT/template registration for Indian SMS;
- record provider terms and consent evidence.

The application blocks many unsafe sends, but clinic staff still need an approved messaging policy.

## Product changes still recommended before legal launch

1. Add public routes/pages for Privacy Notice, Terms, Contact/Grievance, and Cookie Notice where applicable.
2. Store the notice version shown at booking and portal registration, not only the consent version string.
3. Add patient-rights request records and staff workflow for access, correction, withdrawal, and deletion decisions.
4. Add retention-policy configuration and a documented deletion/anonymisation job after legal approval.
5. Add audit events for clinical-record reads, edits, exports, deletions, staff access, and consent changes.
6. Add a subprocessor/version register under clinic/admin settings.
7. Add invoice fields required by the clinic's CA and clearly label tax configuration as clinic responsibility.
8. Add a visible emergency disclaimer to booking and portal pages if the product is not monitored for emergencies.

## Official sources to review

- Digital Personal Data Protection Act, 2023 — India Code: https://www.indiacode.nic.in/indiacode/handle/123456789/22037?view_type=browse
- Digital Personal Data Protection Rules, 2025 — MeitY: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- CERT-In Directions under Section 70B — https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
- NMC Code of Medical Ethics / record guidance — https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002/
- MeitY SPDI Rules page — https://www.meity.gov.in/content/information-technology-reasonable-security-practices-and-procedures-and-sensitive-personal-data
- GST e-invoice portal — https://einvoice1.gst.gov.in/

## Go/no-go decision

**Do not launch with real patient data yet** unless the clinic has approved the Privacy Notice, Terms, consent wording, DPA, retention schedule, grievance contact, breach procedure, and tax/medical-record policies. The software security layer is substantially hardened; the missing work is governance, documentation, legal approval, and production operations.
