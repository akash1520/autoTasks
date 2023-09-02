const { google: GoogleAPI } = require('googleapis');
const { getAllTokens } = require('./utils/firebase');

const getOAuthClient = async (tokenData) => {
    try {
        const oAuth2Client = new GoogleAPI.auth.OAuth2(process.env.client_id, process.env.client_secret, process.env.redirect_uris);
        
        if (tokenData) {
            oAuth2Client.setCredentials(tokenData);
            return oAuth2Client;
        } else {
            console.error('Token data is missing');
            return null;
        }
    } catch (error) {
        console.error('Error creating OAuth client:', error);
        return null;
    }
};

const ensureLabelExists = async (auth) => {
    const gmail = GoogleAPI.gmail({ version: 'v1', auth });
    
    try {
        // Fetch all labels
        const { data: { labels } } = await gmail.users.labels.list({ userId: 'me' });
        
        // Check if 'autotasks' label exists
        const label = labels.find(label => label.name === 'autoTasks');
        
        if (label) {
            return label.id;  // Return existing label ID
        } else {
            // If not, create the label
            const { data: newLabel } = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: 'autoTasks',
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                }
            });
            return newLabel.id;  // Return the new label ID
        }
    } catch (error) {
        console.error('Error ensuring label existence:', error);
        return null;  // Indicate failure with null
    }
};



const getEmailBody = (payload) => {
    try {
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
    } catch (error) {
        console.error('Error extracting email body:', error);
        return '';  // Return an empty string if there's an error
    }
};


const createEventFromEmail = async (title, receivedTime, tokenData) => {
    const auth = await getOAuthClient(tokenData);
    const calendar = GoogleAPI.calendar({ version: 'v3', auth });

    const startTime = new Date(receivedTime);
    const currentTime = new Date();  // Current date and time
    
    // Check if startTime is in the future
    if (startTime <= currentTime) {
        console.log(`Skipping event creation as the deadline is in the past.`);
        return;
    }

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


const markEmailAsRead = async (emailId, tokenData) => {
    const auth = await getOAuthClient(tokenData);
    
    // Ensure 'autotasks' label exists and fetch its ID
    const labelId = await ensureLabelExists(auth);
    
    const gmail = GoogleAPI.gmail({ version: 'v1', auth });
    
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
                removeLabelIds: ['UNREAD'],
                addLabelIds: [labelId],  // Use the label ID instead of the hardcoded string
            }
        });
        console.log(`Email with ID: ${emailId} marked as read and labeled as 'autotasks'.`);
    } catch (error) {
        console.error(`Error marking email as read: ${error}`);
    }
};


const main = async (tokenData) => {
    const auth = await getOAuthClient(tokenData);

    if (!auth) {
        setTimeout(main,  60 * 1000);  // Retry after 1 minutes if token doesn't exist
        return;
    }

    const gmail = GoogleAPI.gmail({ version: 'v1', auth });
    const EMAIL_KEYWORDS = ['deadline', 'submit by', 'deadlines', 'reminder'];
    
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
                await createEventFromEmail(emailSubject, emailReceivedTime, tokenData);
                await markEmailAsRead(message.id, tokenData);  // Mark the email as read
            }
        }

        if (!keywordMatched) {
            console.log("No unread emails found with the specified keywords.");
        }
    } catch (err) {
        console.error('The API returned an error:', err);
    }
    setTimeout(() => main(tokenData), 5 * 60 * 1000); 
};

const runForAllTokens = async () => {
    try {
        const tokensData = await getAllTokens();

        // Start the infinite check for each token
        tokensData.forEach(token => {
            main(token.data);  // This will now recursively call itself for each token every 5 minutes
        });
    } catch (error) {
        console.error('Error running for all tokens:', error);
    }
};



runForAllTokens();
