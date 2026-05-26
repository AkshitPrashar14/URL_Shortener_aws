import { useState } from 'react';
import './App.css';

function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statsId, setStatsId] = useState('');
  const [stats, setStats] = useState(null);

  const handleShorten = async (e) => {
    e.preventDefault();
    setError('');
    setShortUrl('');
    setLoading(true);

    // Auto-prepend https:// if user omitted protocol
    let urlToShorten = originalUrl.trim();
    if (urlToShorten && !/^https?:\/\//i.test(urlToShorten)) {
      urlToShorten = 'https://' + urlToShorten;
    }

    if (!urlToShorten) {
      setError('Please enter a URL to shorten.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: urlToShorten }),
      });

      const data = await response.json();
      if (response.ok) {
        setShortUrl(data.shortUrl);
        setStatsId(data.shortId);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!statsId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/stats/${statsId}`);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Url Shortener</h1>
        <p>A fast and scalable URL shortener built with Node.js, React, and Redis.</p>
      </header>

      <main className="main-content">
        <form onSubmit={handleShorten} className="shorten-form">
          <input
            type="text"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="e.g. google.com or https://example.com"
            className="url-input"
          />
          <button type="submit" disabled={loading} className="shorten-btn">
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {shortUrl && (
          <div className="result-container">
            <h3>Your Shortened URL is ready!</h3>
            <div className="short-url-box">
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                {shortUrl}
              </a>
              <button onClick={() => navigator.clipboard.writeText(shortUrl)}>
                Copy
              </button>
            </div>

            <div className="stats-section">
              <button className="stats-btn" onClick={loadStats}>
                Refresh Analytics
              </button>
              {stats && (
                <div className="stats-box">
                  <p><strong>Original URL:</strong> {stats.originalUrl}</p>
                  <p><strong>Total Clicks:</strong> {stats.clicks}</p>
                  <p><strong>Created:</strong> {new Date(stats.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
