require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const redis = require('redis');
const { nanoid } = require('nanoid');
const promClient = require('prom-client');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Metrics setup
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

const shortenCounter = new promClient.Counter({
    name: 'url_shorten_total',
    help: 'Total number of URLs shortened'
});

const redirectCounter = new promClient.Counter({
    name: 'url_redirect_total',
    help: 'Total number of URL redirects'
});

// Database setup
let dbPool;
async function initDb() {
    dbPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS urls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            shortId VARCHAR(20) UNIQUE NOT NULL,
            originalUrl TEXT NOT NULL,
            clicks INT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await dbPool.query(createTableQuery);
    console.log('MySQL Database initialized.');
}

// Redis setup
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function initRedis() {
    await redisClient.connect();
    console.log('Redis initialized.');
}

// Routes
app.post('/api/shorten', async (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'URL is required' });

    const shortId = nanoid(7);
    try {
        await dbPool.query('INSERT INTO urls (shortId, originalUrl) VALUES (?, ?)', [shortId, originalUrl]);
        await redisClient.set(shortId, originalUrl); // Cache it immediately
        shortenCounter.inc();
        res.json({ shortUrl: `${process.env.BASE_URL || `http://localhost:${PORT}`}/${shortId}`, shortId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.get('/:shortId', async (req, res) => {
    const { shortId } = req.params;
    if (shortId === 'metrics' || shortId.startsWith('api')) return res.status(404).send();

    try {
        // Try Cache first
        let originalUrl = await redisClient.get(shortId);

        if (!originalUrl) {
            // Fallback to DB
            const [rows] = await dbPool.query('SELECT originalUrl FROM urls WHERE shortId = ?', [shortId]);
            if (rows.length > 0) {
                originalUrl = rows[0].originalUrl;
                // Save back to cache
                await redisClient.set(shortId, originalUrl);
            } else {
                return res.status(404).json({ error: 'URL not found' });
            }
        }

        // Increment clicks asynchronously
        dbPool.query('UPDATE urls SET clicks = clicks + 1 WHERE shortId = ?', [shortId]).catch(console.error);
        
        redirectCounter.inc();
        res.redirect(originalUrl);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/stats/:shortId', async (req, res) => {
    const { shortId } = req.params;
    try {
        const [rows] = await dbPool.query('SELECT originalUrl, clicks, createdAt FROM urls WHERE shortId = ?', [shortId]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'URL not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


async function start() {
    try {
        await initDb();
        await initRedis();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Delay startup slightly to allow MySQL/Redis containers to initialize completely when using docker-compose
setTimeout(start, 5000);
