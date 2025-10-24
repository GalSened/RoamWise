# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RoamWise, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email the maintainers directly (or use GitHub Security Advisories)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

### Secrets Management

**NEVER commit secrets to the repository:**
- ❌ API keys
- ❌ Passwords
- ❌ Private keys (.key, .pem files)
- ❌ Service account credentials
- ❌ OAuth tokens
- ❌ Database connection strings

**Instead:**
- ✅ Use Google Cloud Secret Manager for production secrets
- ✅ Use `.env` files locally (excluded by .gitignore)
- ✅ Use environment variables in CI/CD
- ✅ Rotate secrets immediately if exposed

### If a Secret is Accidentally Committed

1. **Immediately rotate the secret** (invalidate the old one)
2. Remove it from git history (use `git filter-branch` or BFG Repo-Cleaner)
3. Force push the cleaned history
4. Notify the team
5. Review access logs for unauthorized use

### Code Security

- All PRs are scanned with Gitleaks before merge
- Dependencies are regularly updated to patch vulnerabilities
- E2E tests validate security-critical flows
- CODEOWNERS ensure critical paths are reviewed

### Deployment Security

- GitHub Pages deployment is automated via GitHub Actions
- No secrets are passed to the frontend (client-side code is public)
- API calls use backend proxy with proper authentication
- CORS policies restrict unauthorized origins

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | ✅ Yes            |
| 2.x     | ⚠️ Security fixes only |
| < 2.0   | ❌ No             |

## Security Contacts

- Primary: @galsened
- Security issues: Use GitHub Security Advisories
