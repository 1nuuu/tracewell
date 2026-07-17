# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Tracewell, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email your findings to: **yourinuu@gmail.com** (or create a private security advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability within 7 days
- **Resolution**: Critical vulnerabilities will be addressed within 14 days
- **Disclosure**: We will coordinate disclosure timing with you

### Safe Harbor

We consider security research conducted in good faith to be authorized. We will not pursue legal action against researchers who:

- Act in good faith
- Avoid privacy violations, data destruction, and service disruption
- Report findings promptly and privately
- Give us reasonable time to fix issues before disclosure

## Security Best Practices

When deploying this application:

### Environment

- Use environment variables for any custom configuration
- Never commit `.env` files to version control
- Use HTTPS in production

### Rate Limiting

For production deployments, implement rate limiting:

```typescript
// Example with hono-rate-limiter
import { rateLimiter } from "hono-rate-limiter";

app.use(
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per window
  })
);
```

### Monitoring

- Enable application monitoring (Sentry, LogRocket)
- Set up alerts for unusual traffic patterns
- Monitor dependency vulnerabilities with Dependabot

### API Usage

- Be aware of CoinGecko API rate limits (free tier: 10-50 calls/min)
- The application includes caching to reduce API calls
- For high-traffic deployments, consider CoinGecko Pro API

## Known Limitations

1. **No Authentication**: This application has no user authentication by design
2. **Public Data Only**: All data displayed is publicly available market data
3. **In-Memory Cache**: Cache is not persistent across restarts
4. **Third-Party Dependencies**: We rely on CoinGecko and Coinbase APIs

## Security Features

- ✅ Input validation on all API parameters
- ✅ No SQL/NoSQL injection vectors (no database)
- ✅ No XSS vectors (no user-generated content)
- ✅ TypeScript strict mode enabled
- ✅ Security headers configured
- ✅ Comprehensive error handling
- ✅ Fallback caching for resilience

## Updates

This security policy may be updated periodically. Check this file for the latest information.

---

Thank you for helping keep Tracewell secure!
