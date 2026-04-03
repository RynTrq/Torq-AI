type FirecrawlScrapeResult = {
  markdown: string | null;
};

class FirecrawlClient {
  constructor(private readonly apiKey: string) {}

  async scrape(
    url: string,
    options: { formats: string[] }
  ): Promise<FirecrawlScrapeResult> {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: options.formats,
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      markdown?: string | null;
      data?: {
        markdown?: string | null;
      };
    };

    return {
      markdown: data.data?.markdown ?? data.markdown ?? null,
    };
  }
}

let firecrawlClient: FirecrawlClient | null = null;

export const getFirecrawlClient = () => {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlClient(apiKey);
  }

  return firecrawlClient;
};
