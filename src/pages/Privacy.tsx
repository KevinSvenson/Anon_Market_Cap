import Header from "@/components/Header";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            <strong>Effective Date:</strong> November 19, 2025
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Our Commitment</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              AnonMarketCap is dedicated to protecting your privacy. As a platform focused on privacy-preserving cryptocurrencies, we believe your browsing activity should remain private by default.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">What We DON'T Collect</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We do not collect, store, or track:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li><span className="text-red-500">✗</span> Personal information (name, email, address)</li>
              <li><span className="text-red-500">✗</span> IP addresses or location data</li>
              <li><span className="text-red-500">✗</span> Browsing history or page views</li>
              <li><span className="text-red-500">✗</span> Device fingerprints or user identifiers</li>
              <li><span className="text-red-500">✗</span> Cookies (tracking or analytics)</li>
              <li><span className="text-red-500">✗</span> Any personally identifiable information (PII)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">What Data We DO Process</h2>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">API Requests</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                When you view cryptocurrency prices, your browser makes direct requests to the CoinGecko API. Your IP address may be visible to CoinGecko (a third party). We recommend using a VPN or Tor Browser if you wish to remain anonymous.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">We do not proxy, log, or store these API requests.</strong>
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Browser Storage (Optional Features)</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Future features may use browser localStorage to save:
              </p>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li>Your favorite coins (watchlist)</li>
                <li>Comparison preferences</li>
                <li>Dark mode toggle state</li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">This data never leaves your device. We cannot access it.</strong>
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Third-Party Services</h2>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">CoinGecko API</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                We fetch real-time cryptocurrency prices from{" "}
                <a href="https://www.coingecko.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  CoinGecko
                </a>. Review their{" "}
                <a href="https://www.coingecko.com/en/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  privacy policy
                </a> to understand how they handle API requests.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">CDN & Hosting</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Our site is hosted on Vercel/Netlify. Static assets may be served through their CDN. No user tracking occurs through these services.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">How We Protect Your Privacy</h2>
            <ul className="list-none text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li><span className="text-green-500">✓</span> No analytics or tracking scripts</li>
              <li><span className="text-green-500">✓</span> No third-party JavaScript</li>
              <li><span className="text-green-500">✓</span> HTTPS encryption</li>
              <li><span className="text-green-500">✓</span> No user accounts or registration</li>
              <li><span className="text-green-500">✓</span> No email collection</li>
              <li><span className="text-green-500">✓</span> Open source code (auditable)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Your Rights</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Since we don't collect personal data, there is no data to:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li>Request access to</li>
              <li>Request deletion of</li>
              <li>Request portability of</li>
              <li>Object to processing of</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Changes to This Policy</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We will update this page if our privacy practices change. Check the "Last updated" date at the bottom.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Questions?</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Email us at <a href="mailto:privacy@anonmarketcap.com" className="text-primary hover:underline">privacy@anonmarketcap.com</a>
            </p>
          </section>

          <div className="mt-12 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Recommendation:</strong> Use a VPN or Tor Browser when accessing any cryptocurrency-related websites to maximize your privacy.
            </p>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            <em>Last updated: November 19, 2025</em>
          </p>
        </article>
      </main>
    </div>
  );
};

export default Privacy;

