import { PacerAuth } from './src/index.js';
import { writeFileSync } from 'fs';
import 'dotenv/config';

const auth = new PacerAuth('production'); // or 'production'

// Get credentials from environment variables or prompt user
const username = process.env.PACER_USERNAME || 'your_username';
const password = process.env.PACER_PASSWORD || 'your_password';

async function getToken() {
  try {
    // Login
    const response = await auth.authenticate({
      loginId: username,
      password: password,
      // otpCode: '123456', // optional, for MFA
      // clientCode: 'code', // optional
      redactFlag: '1' // required for filers
    });

    console.log('Authentication response:', response);

    // Token is now stored and can be retrieved
    const token = auth.getToken();

    if (token) {
      // Write token to file
      writeFileSync('token.txt', token);
      console.log('Token written to token.txt');
    } else {
      console.error('No token received');
    }

    // Later, logout
    // await auth.logout();
  } catch (error) {
    console.error('Authentication failed:', error);
    process.exit(1);
  }
}

getToken();