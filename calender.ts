const { google: GoogleAPI } = require('googleapis');
const fsPromises = require('fs').promises;
const CALENDAR_TOKEN_PATH = './token.json';

const getOAuthClient = async () => {
    const oAuth2Client = new GoogleAPI.auth.OAuth2(process.env.client_id, process.env.client_secret, process.env.redirect_uris);

    try {
        const token = await fs.readFile(CALENDAR_TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (error) {
        console.error('Failed to read the token. Will check again in 5 minutes.');
        return null;
    }
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

const createEventFromEmail = async (title, receivedTime) => {
    const auth = await getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const startTime = new Date(receivedTime);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    
    const event = {
        summary: title,
        start: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
        },
    };

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });
        console.log(`Event created: ${response.data.htmlLink}`);
    } catch (error) {
        console.error(`Error: ${error}`);
    }
};

const markEmailAsRead = async (emailId) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
                removeLabelIds: ['UNREAD']
            }
        });
        console.log(`Email with ID: ${emailId} marked as read.`);
    } catch (error) {
        console.error(`Error marking email as read: ${error}`);
    }
};

const main = async () => {
    const auth = await getOAuthClient();

    if (!auth) {
        setTimeout(main,  60 * 1000);  // Retry after 5 minutes if token doesn't exist
        return;
    }

    const gmail = google.gmail({ version: 'v1', auth });
    const EMAIL_KEYWORDS = ['deadline', 'submit by'];
    
    try {
        const { data: { messages } } = await gmail.users.messages.list({ userId: 'me', q: 'is:unread' });

        if (!messages || messages.length === 0) {
            console.log('No new unread emails found.');
            return;
        }

        let keywordMatched = false;

        for (const message of messages) {
            const { data: { payload, internalDate } } = await gmail.users.messages.get({ userId: 'me', id: message.id });
            const emailReceivedTime = parseInt(internalDate, 10);
            
            const emailBody = getEmailBody(payload);
            const hasKeyword = EMAIL_KEYWORDS.some((keyword) => emailBody.toLowerCase().includes(keyword));
            
            if (hasKeyword) {
                keywordMatched = true;
                const emailSubject = payload.headers.find((header) => header.name === 'Subject').value;
                console.log(`Email Subject: ${emailSubject}`);
                await createEventFromEmail(emailSubject, emailReceivedTime);
                await markEmailAsRead(message.id);  // Mark the email as read
            }
        }

        if (!keywordMatched) {
            console.log("No unread emails found with the specified keywords.");
        }
    } catch (err) {
        console.error('The API returned an error:', err);
    }
};


// Call the main function every 5 minutes
setInterval(main, 5 * 60 * 1000);

// Also run immediately on startup
main();
