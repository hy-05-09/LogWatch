# Access Control Policy

## Authentication Failure Monitoring
- Within a 5-minute window, 5 or more failed login attempts from the same user or IP must be treated as suspicious.
- If failures are repeated across multiple accounts from the same IP, escalate incident priority.

## New Country / Geo-velocity
- Access from a new country not previously associated with the user requires additional verification.
- If new country access is combined with failed logins, escalate to security review immediately.

## Night Access (00:00–06:00)
- Access during night hours should be flagged for review unless the user is on an approved exception list.
- If night access occurs from a new device or new country, escalate.

## New Device / Device Mismatch
- Login from a device_id not previously associated with the user must be flagged for review.
- Require step-up authentication (MFA) for new device logins whenever possible.
- If new device login is combined with failed login burst or new country access, escalate to security review.

## Response Guidance
- REVIEW: request user verification, check recent account activity, monitor subsequent logins.
- ESCALATE: lock account temporarily, notify security team, open incident ticket.
