# Security Incident Playbook

## Triage Rules
- HIGH risk: multiple failed logins + new country OR anomalous time + device mismatch.
- MED risk: either multiple failed logins OR night access OR new country alone.

## Operator Actions
### Failed Login Burst
- Confirm source IP reputation and ASN.
- If failures exceed threshold, enforce rate limiting and consider temporary lock.

### New Country Access
- Trigger step-up authentication.
- Validate with user via out-of-band channel if available.

## Evidence Requirements
- Decisions must cite policy/playbook sections used.
- If no evidence is found, do not escalate solely based on speculation.
