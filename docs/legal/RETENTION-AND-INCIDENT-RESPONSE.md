# Dentist OS — retention and incident-response operating plan

**Draft control document — clinic lawyer/CA and security owner must approve.**

## Retention register
Configure and approve separate periods for:

- clinical records and treatment plans;
- invoices and tax records;
- consent records;
- WhatsApp/SMS content and delivery metadata;
- OTP and authentication logs;
- data-rights requests and grievances;
- security logs and incident records;
- backups and terminated-tenant exports.

The Admin → Legal & Compliance page stores these values per clinic. It does not automatically delete data until the Clinic approves and implements a tested deletion/anonymisation job.

## Incident response
1. Record the incident in Admin → Legal & Compliance immediately.
2. Contain access, tokens, accounts, integrations, or exposed endpoints.
3. Preserve logs and a timeline; do not overwrite evidence.
4. Identify clinics, patients, data types, jurisdictions, and time window affected.
5. Notify the clinic owner and legal/security contacts.
6. Assess CERT-In and other reporting duties with counsel.
7. Decide patient/provider/regulator communications with the Clinic and lawyer.
8. Rotate credentials, patch the cause, validate recovery, and record closure.
9. Complete a post-incident review and update controls.
