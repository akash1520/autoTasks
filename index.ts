const fs = require('fs').promises;
const { google } = require('googleapis');

const TOKEN_PATH = './token.json';
const EMAIL_KEYWORDS = ['deadline', 'submit by'];
const credentials = require('./secrets.json');

const getGmailClient = async () => {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const token = await fs.readFile(TOKEN_PATH, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
    
    return oAuth2Client;
};

const getEmailBody = (payload) => {
    if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            const body = getEmailBody(part);
            if (body) {
                return body;
            }
        }
    }

    return '';
};

const main = async () => {
    const auth = await getGmailClient();
    const gmail = google.gmail({ version: 'v1', auth });
    
    try {
        const { data: { messages } } = await gmail.users.messages.list({ userId: 'me', q: 'is:unread' });

        if (!messages || messages.length === 0) {
            console.log('No unread emails found.');
            return;
        }

        for (const message of messages) {
            const { data: { payload } } = await gmail.users.messages.get({ userId: 'me', id: message.id });

            const emailBody = getEmailBody(payload);
            const hasKeyword = EMAIL_KEYWORDS.some((keyword) => emailBody.toLowerCase().includes(keyword));
            
            if (hasKeyword) {
                const emailSubject = payload.headers.find((header) => header.name === 'Subject').value;
                console.log(`Email Subject: ${emailSubject}`);
            }
        }
    } catch (err) {
        console.error('The API returned an error:', err);
    }
};

main();
