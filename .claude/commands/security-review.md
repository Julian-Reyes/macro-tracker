Perform a security review of this codebase. Focus on:

1. **Authentication & Authorization**: JWT handling, token expiry, secret management, auth bypass risks
2. **Input Validation**: User inputs, file uploads, API parameters — check for injection, XSS, path traversal
3. **API Security**: Rate limiting coverage, CORS config, error message leakage, missing auth on endpoints
4. **Data Exposure**: Sensitive data in logs, responses, or client-side code. API keys, credentials, PII
5. **Dependencies**: Known vulnerabilities in npm packages (run `npm audit` for both root and server)
6. **Infrastructure**: Dockerfile security, environment variable handling, secrets management
7. **OWASP Top 10**: Check for SQL injection (Prisma parameterization), broken access control, security misconfiguration, SSRF

For each finding:
- **Severity**: Critical / High / Medium / Low
- **Location**: File path and line number
- **Issue**: What's wrong
- **Fix**: Specific code change or configuration needed

Prioritize findings by severity. Skip issues already documented in CLAUDE.md's "Remaining hardening" section unless they've worsened.
