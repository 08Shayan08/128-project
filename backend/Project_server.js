const http = require('http');
const fs = require('fs');
const url = require('url');
const mysql = require('mysql2');
const path = require('path');

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

// All seed data matching data.json
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
  ]
};

function seedTableIfEmpty(table, columns, rows, callback) {
  con.query(`SELECT COUNT(*) AS count FROM ${table}`, (err, result) => {
    if (err) return callback(err);
    if (result[0].count > 0) return callback(null);

    const placeholders = rows.map(row => `(${row.map(() => '?').join(', ')})`).join(', ');
    const values = rows.flat();
    con.query(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`, values, callback);
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
      `, (err) => {
        if (err) throw err;

        seedTableIfEmpty('Services', 'title, `desc`', seedData.Services, () => {});
        seedTableIfEmpty('Team', 'name, role', seedData.Team, () => {});
        seedTableIfEmpty('Testimonials', 'name, `text`', seedData.Testimonials, () => {});
        seedTableIfEmpty('CompanyHistory', 'year, milestone', seedData.CompanyHistory, () => {});
        seedTableIfEmpty('Awards', 'year, title, body', seedData.Awards, () => {});

        console.log('Database ready.');
      });
    });
  });
});

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body));
    } catch (e) {
      callback(new Error('Invalid JSON'));
    }
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // GET /data/data.json — serve all dynamic data from MySQL
  if (method === 'GET' && reqUrl.pathname === '/data/data.json') {
    const queries = [
      'SELECT * FROM Services',
      'SELECT * FROM Team',
      'SELECT * FROM Testimonials',
      'SELECT * FROM CompanyHistory ORDER BY year ASC',
      'SELECT * FROM Awards ORDER BY year ASC'
    ];

    con.query(queries.join('; '), (err, results) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Database error' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        services: results[0],
        team: results[1],
        testimonials: results[2],
        history: results[3],
        awards: results[4]
      }));
    });

  // POST /api/contact — save contact form submission to Comments table
  } else if (method === 'POST' && reqUrl.pathname === '/api/contact') {
    parseBody(req, (err, data) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid request body' }));
      }

      const { name, email, message } = data;

      if (!name || !email || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Name, email, and message are required.' }));
      }

      con.query(
        'INSERT INTO Comments (name, email, message) VALUES (?, ?, ?)',
        [name.trim(), email.trim(), message.trim()],
        (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Could not save message.' }));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Your message has been saved.' }));
        }
      );
    });

  // Serve static frontend files
  } else {
    let filePath = reqUrl.pathname === '/'
      ? './frontend/index.html'
      : './frontend' + reqUrl.pathname;

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File not found');
      }

      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    });
  }
});

server.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});
