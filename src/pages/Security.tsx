import Header from "@/components/Header";

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6">Security</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Our Commitment to Security</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              AnonMarketCap takes security seriously. This page outlines our security practices and how to report vulnerabilities.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Security Practices</h2>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Application Security</h3>
              <ul className="list-none text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">HTTPS Only:</strong> All traffic is encrypted via TLS 1.3</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">Content Security Policy:</strong> Strict CSP headers prevent XSS attacks</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">No User Data:</strong> No databases to breach or passwords to steal</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">Input Sanitization:</strong> All user inputs are sanitized to prevent injection attacks</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">Dependency Audits:</strong> Regular `npm audit` checks for vulnerable packages</li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Data Security</h3>
              <ul className="list-none text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">Client-Side Only:</strong> All data processing happens in your browser</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">No Server Storage:</strong> We don't store user data, search queries, or API responses</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">API Validation:</strong> All API responses are validated before display</li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Privacy Security</h3>
              <ul className="list-none text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">No Tracking:</strong> No analytics, cookies, or fingerprinting scripts</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">No Third-Party Scripts:</strong> Only CoinGecko API for price data</li>
                <li><span className="text-green-500">✓</span> <strong className="text-foreground">Open Source:</strong> Code is auditable on GitHub</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Responsible Disclosure</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              If you discover a security vulnerability, please follow responsible disclosure practices:
            </p>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">How to Report</h3>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><strong className="text-foreground">Email:</strong> <a href="mailto:security@anonmarketcap.com" className="text-primary hover:underline">security@anonmarketcap.com</a></li>
                <li><strong className="text-foreground">PGP Key:</strong> <a href="https://anonmarketcap.com/pgp-key.asc" className="text-primary hover:underline">Download our public key</a></li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">What to Include</h3>
              <ol className="list-decimal list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><strong className="text-foreground">Vulnerability description:</strong> What's the issue?</li>
                <li><strong className="text-foreground">Steps to reproduce:</strong> How can we replicate it?</li>
                <li><strong className="text-foreground">Impact assessment:</strong> What's the potential harm?</li>
                <li><strong className="text-foreground">Proof of concept:</strong> (Optional) Demo or screenshots</li>
              </ol>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Our Response Process</h3>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li><strong className="text-foreground">24 hours:</strong> Acknowledgment of report</li>
                <li><strong className="text-foreground">7 days:</strong> Initial assessment and severity rating</li>
                <li><strong className="text-foreground">30 days:</strong> Fix deployed (for critical issues)</li>
                <li><strong className="text-foreground">Public disclosure:</strong> After fix is deployed (with your consent)</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Bug Bounty Program</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We offer bounties for qualifying vulnerabilities:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Severity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Bounty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm text-foreground">🔴 Critical</td>
                    <td className="px-4 py-3 text-sm text-foreground">$500</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm text-foreground">🟠 High</td>
                    <td className="px-4 py-3 text-sm text-foreground">$250</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm text-foreground">🟡 Medium</td>
                    <td className="px-4 py-3 text-sm text-foreground">$100</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-sm text-foreground">🔵 Low</td>
                    <td className="px-4 py-3 text-sm text-foreground">Public acknowledgment</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">In-Scope Vulnerabilities</h3>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li>XSS (Cross-Site Scripting)</li>
                <li>CSRF (Cross-Site Request Forgery)</li>
                <li>Injection attacks (SQL, NoSQL, Command)</li>
                <li>Authentication/authorization bypass</li>
                <li>Sensitive data exposure</li>
                <li>Security misconfiguration</li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Out-of-Scope</h3>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li>Social engineering attacks</li>
                <li>Physical attacks</li>
                <li>DoS/DDoS attacks</li>
                <li>Vulnerabilities in third-party services (report to them directly)</li>
                <li>Issues requiring unlikely user interaction</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Security Headers</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Our site implements the following security headers:
            </p>
            <pre className="bg-muted p-4 rounded-lg text-sm text-muted-foreground overflow-x-auto mb-4">
{`Content-Security-Policy: default-src 'self'; img-src 'self' https:; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=()`}
            </pre>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Test our headers:{" "}
              <a href="https://securityheaders.com/?q=anonmarketcap.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                SecurityHeaders.com
              </a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Dependency Security</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We maintain security through:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li>Automated Dependabot alerts</li>
              <li>Monthly manual dependency audits</li>
              <li>Minimal dependency footprint (fewer packages = smaller attack surface)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Incident Response</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              In the unlikely event of a security incident:
            </p>
            <ol className="list-decimal list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li>Issue will be immediately investigated</li>
              <li>Affected systems will be isolated</li>
              <li>Users will be notified within 72 hours</li>
              <li>Post-mortem report will be published</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Hall of Fame</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We thank these security researchers for responsible disclosures:
            </p>
            <p className="text-base text-muted-foreground italic">
              (No vulnerabilities reported yet)
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Questions?</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Email us at <a href="mailto:security@anonmarketcap.com" className="text-primary hover:underline">security@anonmarketcap.com</a>
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-12">
            <em>Last updated: November 19, 2025</em>
          </p>
        </article>
      </main>
    </div>
  );
};

export default Security;

