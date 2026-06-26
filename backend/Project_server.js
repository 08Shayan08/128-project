const http = require('http');
const fs = require('fs');
const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto');

// Load .env file if present (no external package needed)
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
} catch (_) {}

const con = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  multipleStatements: true
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Active session tokens (in-memory; resets on server restart)
const activeSessions = new Set();

// Seed data
const seedData = {
  Services: [
    ['Social Media Management', 'End-to-end management of your social channels, including content scheduling, community engagement, and performance reporting. We keep your brand consistent, active, and audience-focused.'],
    ['Content Creation', 'Professional visuals, captions, reels, and campaign assets designed to match your brand voice. Our content is built to capture attention and support measurable growth.'],
    ['Paid Advertising', 'Strategic ad campaigns across platforms like Meta, TikTok, LinkedIn, and Google. We optimize targeting, creative, and budgets to improve conversions and return on spend.'],
    ['Branding', 'Clear brand positioning, messaging, and visual direction for businesses that want to stand out. We help create a recognizable identity across every digital touchpoint.'],
    ['Influencer Marketing', 'Partnership planning, creator outreach, and campaign coordination with influencers who align with your audience. We focus on authentic collaborations that build trust and visibility.']
  ],
  Team: [
    ['Shayan', 'Founder'],
    ['Aisha Rahman', 'Marketing Strategist'],
    ['Nina Patel', 'Content Creator'],
    ['Lucas Bennett', 'Developer']
  ],
  Testimonials: [
    ['Amira Khalid', 'The team helped us clarify our brand message and turn social media into a real source of qualified leads.'],
    ['Daniel Brooks', 'Their content strategy gave our campaigns a sharper direction and noticeably improved engagement within weeks.'],
    ['Sofia Martinez', 'PulseReach brought structure, creativity, and clear reporting to every stage of our marketing workflow.'],
    ['Ethan Wright', 'Their paid advertising approach helped us scale confidently while keeping our acquisition costs under control.']
  ],
  CompanyHistory: [
    [2020, 'PulseReach founded by Shayan with a vision to make social media marketing accessible to ambitious brands across the GCC.'],
    [2021, 'Expanded services to include content creation. Onboarded first 10 clients and built a dedicated creative team.'],
    [2022, 'Launched paid advertising division. Team grew to 8 people and surpassed 10M monthly impressions managed.'],
    [2023, 'Reached 50M monthly impressions milestone. Recognized at the MENA Marketing Summit for excellence in digital campaigns.'],
    [2024, 'Expanded influencer marketing offering. Grew to 80+ active brand clients and opened a second office in Dubai.'],
    [2025, 'Managing 120M+ monthly impressions for 100+ brands. Named one of the fastest-growing agencies in the Middle East.']
  ],
  Awards: [
    [2022, 'Best Digital Agency', 'Dubai Business Awards'],
    [2023, 'Top Social Media Agency', 'MENA Marketing Summit'],
    [2024, 'Excellence in Paid Media', 'Global Ad Awards'],
    [2025, 'Fastest Growing Agency', 'Forbes Middle East']
  ],
  // Default admin: username=admin password=admin123
  Admins: [
    ['admin', hashPassword('admin123')]
  ]
};

function seedTableIfEmpty(table, columns, rows, callback) {
  con.query(`SELECT COUNT(*) AS count FROM ${table}`, (err, result) => {
    if (err) return callback(err);
    if (result[0].count > 0) return callback(null);
    const placeholders = rows.map(row => `(${row.map(() => '?').join(', ')})`).join(', ');
    con.query(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`, rows.flat(), callback);
  });
}

con.connect((err) => {
  if (err) throw err;

  con.query('CREATE DATABASE IF NOT EXISTS pulsereach_db', () => {
    con.query('USE pulsereach_db', () => {
      con.query(`
        CREATE TABLE IF NOT EXISTS Services (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(100),
          \`desc\` TEXT
        );

        CREATE TABLE IF NOT EXISTS Team (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          role VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS Testimonials (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          \`text\` TEXT
        );

        CREATE TABLE IF NOT EXISTS CompanyHistory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          year INT,
          milestone TEXT
        );

        CREATE TABLE IF NOT EXISTS Awards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          year INT,
          title VARCHAR(150),
          body VARCHAR(150)
        );

        CREATE TABLE IF NOT EXISTS Comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(150),
          message TEXT,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Subscribers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(150) UNIQUE NOT NULL,
          subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) throw err;

        seedTableIfEmpty('Services', 'title, `desc`', seedData.Services, () => {});
        seedTableIfEmpty('Team', 'name, role', seedData.Team, () => {});
        seedTableIfEmpty('Testimonials', 'name, `text`', seedData.Testimonials, () => {});
        seedTableIfEmpty('CompanyHistory', 'year, milestone', seedData.CompanyHistory, () => {});
        seedTableIfEmpty('Awards', 'year, title, body', seedData.Awards, () => {});
        seedTableIfEmpty('Admins', 'username, password_hash', seedData.Admins, () => {});

        console.log('Database ready — http://localhost:8080');
      });
    });
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try { callback(null, JSON.parse(body)); }
    catch (_) { callback(new Error('Invalid JSON')); }
  });
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function isAuthenticated(req) {
  const token = getToken(req);
  return token && activeSessions.has(token);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:8080`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── GET /data/data.json ── public site data from MySQL ──────────────────────
  if (method === 'GET' && pathname === '/data/data.json') {
    con.query(
      'SELECT * FROM Services; SELECT * FROM Team; SELECT * FROM Testimonials; SELECT * FROM CompanyHistory ORDER BY year ASC; SELECT * FROM Awards ORDER BY year ASC',
      (err, results) => {
        if (err) return json(res, 500, { error: 'Database error' });
        json(res, 200, {
          services: results[0],
          team: results[1],
          testimonials: results[2],
          history: results[3],
          awards: results[4]
        });
      }
    );

  // ── POST /api/contact ── save contact form message ──────────────────────────
  } else if (method === 'POST' && pathname === '/api/contact') {
    parseBody(req, (err, data) => {
      if (err) return json(res, 400, { error: 'Invalid request body' });
      const { name, email, message } = data;
      if (!name || !email || !message)
        return json(res, 400, { error: 'Name, email, and message are required.' });

      con.query(
        'INSERT INTO Comments (name, email, message) VALUES (?, ?, ?)',
        [name.trim(), email.trim(), message.trim()],
        (err) => {
          if (err) return json(res, 500, { error: 'Could not save message.' });
          json(res, 200, { success: true, message: 'Your message has been received.' });
        }
      );
    });

  // ── POST /api/subscribe ── newsletter signup ─────────────────────────────────
  } else if (method === 'POST' && pathname === '/api/subscribe') {
    parseBody(req, (err, data) => {
      if (err) return json(res, 400, { error: 'Invalid request body' });
      const email = (data.email || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(res, 400, { error: 'Please enter a valid email address.' });

      con.query(
        'INSERT INTO Subscribers (email) VALUES (?)',
        [email],
        (err) => {
          if (err && err.code === 'ER_DUP_ENTRY')
            return json(res, 409, { error: 'This email is already subscribed.' });
          if (err) return json(res, 500, { error: 'Could not save subscription.' });
          json(res, 200, { success: true, message: 'You are now subscribed!' });
        }
      );
    });

  // ── POST /api/login ── admin login ───────────────────────────────────────────
  } else if (method === 'POST' && pathname === '/api/login') {
    parseBody(req, (err, data) => {
      if (err) return json(res, 400, { error: 'Invalid request body' });
      const { username, password } = data;
      if (!username || !password)
        return json(res, 400, { error: 'Username and password are required.' });

      const hash = hashPassword(password);
      con.query(
        'SELECT id FROM Admins WHERE username = ? AND password_hash = ?',
        [username.trim(), hash],
        (err, results) => {
          if (err) return json(res, 500, { error: 'Database error' });
          if (results.length === 0)
            return json(res, 401, { error: 'Invalid username or password.' });

          const token = crypto.randomBytes(32).toString('hex');
          activeSessions.add(token);
          json(res, 200, { success: true, token });
        }
      );
    });

  // ── POST /api/logout ── invalidate token ─────────────────────────────────────
  } else if (method === 'POST' && pathname === '/api/logout') {
    const token = getToken(req);
    if (token) activeSessions.delete(token);
    json(res, 200, { success: true });

  // ── GET /api/admin/comments ── view all contact messages (protected) ─────────
  } else if (method === 'GET' && pathname === '/api/admin/comments') {
    if (!isAuthenticated(req)) return json(res, 401, { error: 'Unauthorised' });
    con.query('SELECT * FROM Comments ORDER BY submitted_at DESC', (err, rows) => {
      if (err) return json(res, 500, { error: 'Database error' });
      json(res, 200, { comments: rows });
    });

  // ── GET /api/admin/subscribers ── view newsletter list (protected) ───────────
  } else if (method === 'GET' && pathname === '/api/admin/subscribers') {
    if (!isAuthenticated(req)) return json(res, 401, { error: 'Unauthorised' });
    con.query('SELECT * FROM Subscribers ORDER BY subscribed_at DESC', (err, rows) => {
      if (err) return json(res, 500, { error: 'Database error' });
      json(res, 200, { subscribers: rows });
    });

  // ── Static file fallback ─────────────────────────────────────────────────────
  } else {
    let filePath = pathname === '/' ? './frontend/index.html' : './frontend' + pathname;
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png',
      '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, content) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    });
  }
});

server.listen(8080, () => console.log('Server running at http://localhost:8080'));
