const http = require('http');
const fs = require('fs');
const url = require('url');
const mysql = require('mysql2');
const path = require('path');

const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
});

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
          text TEXT
        );
      `);
    });
  });
});

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);

  if (reqUrl.pathname === '/data/data.json') {
    con.query(
      'SELECT * FROM Services; SELECT * FROM Team; SELECT * FROM Testimonials;',
      (err, results) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end("Database error");
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });

        res.end(JSON.stringify({
          services: results[0],
          team: results[1],
          testimonials: results[2]
        }));
      }
    );

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
        return res.end("File not found");
      }

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'text/plain'
      });

      res.end(content);
    });
  }
});

server.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});