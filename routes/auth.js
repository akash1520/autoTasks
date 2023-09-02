const { saveTokenToFirestore } = require("../utils/firebase");
const express = require("express");
const { google } = require('googleapis');


const router = express.Router();

const oAuth2Client = new google.auth.OAuth2(process.env.client_id, process.env.client_secret, process.env.redirect_uris);
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.events'
];


router.get('/auth', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
  
    res.redirect(authUrl); // Redirect the user to the authorization URL
  });
  
  router.get('/auth/callback', async (req, res) => {
    try {
        const code = req.query.code;
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
  
        await saveTokenToFirestore(tokens);
  
        res.send('Authorization successful. You can close this tab now.');
    } catch (error) {
        console.error('Error during the authorization callback:', error);
        res.status(500).send('An error occurred during authorization.');
    }
  });
  
module.exports = {router};