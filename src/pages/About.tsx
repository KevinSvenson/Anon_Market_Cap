import Header from "@/components/Header";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6">About AnonMarketCap</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Our Mission</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              AnonMarketCap is the authoritative source for privacy cryptocurrency intelligence. We provide accurate, unbiased data and research-backed analysis for 100+ privacy-focused cryptocurrencies—without compromising your privacy in the process.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">What We Do</h2>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Privacy Coin Tracking</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Real-time price data, market capitalization, volume, and 24-hour changes for over 100 privacy-focused cryptocurrencies. We track only coins with genuine privacy features—no generic cryptocurrencies.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Technology Analysis</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Each coin is classified by its underlying privacy technology: zk-SNARKs, Ring Signatures, Mimblewimble, CoinJoin, and more. We explain how each technology works in accessible terms.
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Privacy Scoring</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Our proprietary privacy score (0-100) evaluates coins based on five critical features:
              </p>
              <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
                <li>Hidden transaction amounts</li>
                <li>Hidden sender identity</li>
                <li>Hidden recipient identity</li>
                <li>Privacy enabled by default</li>
                <li>IP obfuscation support</li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3 mt-8">Security Ratings</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Independent security ratings (1-10) based on code audits, vulnerability history, and active development status.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Our Data Sources</h2>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li><strong className="text-foreground">Price Data:</strong> CoinGecko API (real-time)</li>
              <li><strong className="text-foreground">Privacy Metadata:</strong> Manual research from whitepapers, audits, and official documentation</li>
              <li><strong className="text-foreground">Security Ratings:</strong> Based on published audit reports and GitHub activity</li>
              <li><strong className="text-foreground">Technology Classification:</strong> Verified against official project documentation</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Our Values</h2>

            <div className="mb-6">
              <h3 className="text-xl font-medium mb-3 mt-8">Privacy-First</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <span className="text-green-500">✓</span> We don't use analytics, tracking cookies, or third-party scripts. Your browsing is private.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-medium mb-3 mt-8">Transparency</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <span className="text-green-500">✓</span> Our methodology is public. Every score can be verified against our published criteria.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-medium mb-3 mt-8">Accuracy</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <span className="text-green-500">✓</span> We prioritize correctness over speed. Coins with incomplete data are flagged as "Unknown."
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-medium mb-3 mt-8">No Bias</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                <span className="text-green-500">✓</span> We don't accept payments for listings or higher rankings. All coins are evaluated using the same criteria.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Open Source</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              AnonMarketCap is open source. View our code, suggest improvements, or contribute privacy metadata on{" "}
              <a href="https://github.com/yourusername/anonmarketcap" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Found an error in our data?{" "}
              <a href="https://github.com/yourusername/anonmarketcap/issues" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Submit a correction
              </a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 mt-12">Contact</h2>
            <ul className="list-none text-base text-muted-foreground leading-relaxed mb-4 space-y-2">
              <li>General inquiries: <a href="mailto:hello@anonmarketcap.com" className="text-primary hover:underline">hello@anonmarketcap.com</a></li>
              <li>Data corrections: <a href="mailto:data@anonmarketcap.com" className="text-primary hover:underline">data@anonmarketcap.com</a></li>
              <li>Security issues: <a href="mailto:security@anonmarketcap.com" className="text-primary hover:underline">security@anonmarketcap.com</a></li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground mt-12">
            <em>Last updated: November 2025</em>
          </p>
        </article>
      </main>
    </div>
  );
};

export default About;

