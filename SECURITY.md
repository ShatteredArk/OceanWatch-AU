# Security Policy

## Supported versions

| Version              | Supported |
| -------------------- | --------- |
| 0.x (v0 pre-release) | Yes       |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email `security@oceanwatch-au.example.com` with the subject line
`[SECURITY] OceanWatch AU — <brief description>`.

Include:

- A description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested remediation

You can expect an acknowledgement within 48 hours and a resolution timeline
within 7 business days for critical issues.

## Scope

- API endpoints (`/api/*`)
- Environment variable handling
- Copernicus credential storage and transmission
- PostGIS query construction (SQL injection surface)
- Cron endpoint authentication

## Out of scope

- Issues in upstream Copernicus services
- Denial-of-service via public tile CDNs
- CVSS < 4.0 (informational / low severity)
