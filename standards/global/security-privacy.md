---
id: SECURITY
name: Security & Privacy Standards
version: 1.0.0
owner: "Security Team"
last_updated: "2026-01-02"
---

## Purpose

These standards protect our users, our data, and our organization. Security and privacy are non-negotiable aspects of all work.

## Musts (Non-Negotiable)

- [SEC-1] **No Secrets in Code**: API keys, passwords, tokens, and credentials MUST NOT be committed to version control or hardcoded in source files.
- [SEC-2] **PII Protection**: Personally Identifiable Information (PII) MUST NOT appear in logs, error messages, analytics, or AI prompts.
- [SEC-3] **Input Validation**: All user input MUST be validated and sanitized before processing or storage.
- [SEC-4] **Authentication Required**: All endpoints that access user data MUST require authentication.
- [SEC-5] **Least Privilege**: Systems and users MUST have only the minimum permissions required for their function.
- [SEC-6] **Encryption in Transit**: All data transmission MUST use TLS/HTTPS; no unencrypted HTTP for production.
- [SEC-7] **Dependency Awareness**: Known security vulnerabilities in dependencies MUST be addressed before deployment.

## Shoulds (Strong Recommendations)

- [SEC-10] **Encryption at Rest**: Sensitive data SHOULD be encrypted when stored.
- [SEC-11] **Audit Logging**: Security-relevant actions SHOULD be logged for audit purposes (without PII).
- [SEC-12] **Rate Limiting**: Public endpoints SHOULD implement rate limiting to prevent abuse.
- [SEC-13] **Security Headers**: Web applications SHOULD implement security headers (CSP, HSTS, etc.).
- [SEC-14] **Regular Reviews**: Security-sensitive code SHOULD receive additional review from security-aware team members.

## Examples

### Good: Proper Secret Management
```javascript
// Secrets loaded from environment variables
const apiKey = process.env.STRIPE_API_KEY;
```

### Bad: Hardcoded Secrets
```javascript
// NEVER DO THIS
const apiKey = "sk_live_abc123xyz789";
```

### Good: Safe Logging
```javascript
logger.info("User logged in", { userId: user.id });
```

### Bad: PII in Logs
```javascript
// NEVER DO THIS
logger.info("User logged in", { email: user.email, ssn: user.ssn });
```

## References

- Link to your security policies
- Link to your data classification guide
- Link to your incident response procedures
- OWASP Top 10: https://owasp.org/www-project-top-ten/
