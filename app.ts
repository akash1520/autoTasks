const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
require('./calender.ts');

const app = express();

// Load your credentials from the downloaded JSON file
const credentials = require('./secrets.json');
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_PATH = 'token.json'; // Store the token in a file

app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  res.redirect(authUrl); // Redirect the user to the authorization URL
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

  res.send('Authorization successful. You can close this tab now.');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});