import { useState } from "react";

type VideoResult = {
  url: string;
  quality: string;
  label: string;
};

type Status = "idle" | "loading" | "success" | "error";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="fb-logo">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" className="spinner">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

const QUALITY_ORDER = ["hd", "sd", "audio", "hd (no watermark)", "sd (no watermark)"];

function qualitySort(a: VideoResult, b: VideoResult) {
  const ai = QUALITY_ORDER.indexOf(a.quality.toLowerCase());
  const bi = QUALITY_ORDER.indexOf(b.quality.toLowerCase());
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
}

function isValidFbUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("facebook.com") ||
      u.hostname.includes("fb.com") ||
      u.hostname.includes("fb.watch")
    );
  } catch {
    return false;
  }
}

async function fetchVideoLinks(url: string): Promise<VideoResult[]> {
  const API = "https://api.cobalt.tools/";

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url,
      downloadMode: "auto",
      videoQuality: "max",
    }),
  });

  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`);
  }

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.code || "Could not process this URL");
  }

  if (data.status === "redirect" || data.status === "tunnel" || data.url) {
    return [
      { url: data.url || data.tunnel, quality: "HD", label: "Download Video (HD)" },
    ];
  }

  if (data.status === "picker" && Array.isArray(data.picker)) {
    return data.picker.map((item: { url: string; quality?: string }, i: number) => ({
      url: item.url,
      quality: item.quality || `Option ${i + 1}`,
      label: `Download ${item.quality || `Option ${i + 1}`}`,
    }));
  }

  throw new Error("No downloadable content found for this URL");
}

const HOW_TO_STEPS = [
  { num: "1", text: "Open Facebook and find the video you want to download." },
  { num: "2", text: "Click the three-dot menu on the post and select \"Copy link\"." },
  { num: "3", text: "Paste the link above and click the Download button." },
  { num: "4", text: "Choose your preferred quality and save the file." },
];

const FEATURES = [
  { icon: "⚡", title: "Lightning Fast", desc: "Get your download link in seconds." },
  { icon: "🎬", title: "HD Quality", desc: "Download in the highest available resolution." },
  { icon: "🔒", title: "100% Private", desc: "We never store or track your URLs." },
  { icon: "🌐", title: "No Install", desc: "Works directly in your browser." },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Please paste a Facebook video URL.");
      setStatus("error");
      return;
    }

    if (!isValidFbUrl(trimmed)) {
      setError("That doesn't look like a valid Facebook URL. Please check and try again.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setResults([]);
    setError("");

    try {
      const links = await fetchVideoLinks(trimmed);
      const sorted = [...links].sort(qualitySort);
      setResults(sorted);
      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleCopy = async (link: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setUrl("");
    setStatus("idle");
    setResults([]);
    setError("");
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />
        </div>

        <div className="container">
          <div className="brand">
            <FacebookIcon />
            <h1 className="brand-title">FB Video Downloader</h1>
          </div>
          <p className="hero-sub">Download Facebook videos in HD quality — free, fast, and private.</p>

          <form className="search-box" onSubmit={handleSubmit} noValidate>
            <div className={`input-wrap ${status === "error" ? "input-wrap--error" : ""}`}>
              <span className="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <input
                type="url"
                className="url-input"
                placeholder="Paste Facebook video URL here..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                aria-label="Facebook video URL"
                autoComplete="off"
                spellCheck={false}
              />
              {url && (
                <button type="button" className="clear-btn" onClick={handleClear} aria-label="Clear">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" className="download-btn" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <SpinnerIcon />
                  <span>Fetching…</span>
                </>
              ) : (
                <>
                  <DownloadIcon />
                  <span>Download</span>
                </>
              )}
            </button>
          </form>

          {status === "error" && (
            <div className="alert alert--error" role="alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {status === "success" && results.length > 0 && (
            <div className="results-card">
              <p className="results-label">Choose your download quality</p>
              <div className="results-list">
                {results.map((item, idx) => (
                  <div key={idx} className="result-row">
                    <div className="result-info">
                      <span className={`quality-badge quality-badge--${item.quality.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.quality}
                      </span>
                    </div>
                    <div className="result-actions">
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => handleCopy(item.url, idx)}
                        title="Copy link"
                        aria-label="Copy link"
                      >
                        {copiedIdx === idx ? <CheckIcon /> : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                        <span>{copiedIdx === idx ? "Copied!" : "Copy"}</span>
                      </button>
                      <a
                        href={item.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dl-btn"
                      >
                        <DownloadIcon />
                        <span>Download {item.quality}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="how-to">
            <h2 className="section-title">How to Download</h2>
            <p className="section-sub">Follow these simple steps to save any Facebook video.</p>
            <ol className="steps">
              {HOW_TO_STEPS.map((step) => (
                <li key={step.num} className="step">
                  <span className="step-num">{step.num}</span>
                  <p className="step-text">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="features">
            <h2 className="section-title">Why Use FB Downloader?</h2>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="feature-card">
                  <span className="feature-icon">{f.icon}</span>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="faq">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary className="faq-q">Is this tool free to use?</summary>
                <p className="faq-a">Yes, completely free with no registration required.</p>
              </details>
              <details className="faq-item">
                <summary className="faq-q">What video formats are supported?</summary>
                <p className="faq-a">We support MP4 downloads in HD and SD quality, depending on what Facebook makes available.</p>
              </details>
              <details className="faq-item">
                <summary className="faq-q">Can I download private videos?</summary>
                <p className="faq-a">No. Only publicly accessible videos can be downloaded. Private or friends-only videos are not accessible.</p>
              </details>
              <details className="faq-item">
                <summary className="faq-q">Is it legal to download Facebook videos?</summary>
                <p className="faq-a">You should only download videos for personal use or content you own. Always respect copyright and Facebook's terms of service.</p>
              </details>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-brand">
            <FacebookIcon />
            <span>FB Video Downloader</span>
          </div>
          <p className="footer-note">For personal use only. Respect copyright and content creators.</p>
        </div>
      </footer>
    </div>
  );
}
