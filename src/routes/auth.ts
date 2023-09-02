import { Request, Response, Router } from 'express';
import { google } from 'googleapis';
import { saveTokenToFirestore } from '../utils/firebase';

const router: Router = Router();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES: string[] = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.events'
];


router.get('/auth', (res: Response) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  res.redirect(authUrl); // Redirect the user to the authorization URL
});

router.get('/auth/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string; // type assertion
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    await saveTokenToFirestore(tokens);

    res.send('Authorization successful. You can close this tab now.');
  } catch (error) {
    console.error('Error during the authorization callback:', error);
    res.status(500).send('An error occurred during authorization.');
  }
});

export { router };
