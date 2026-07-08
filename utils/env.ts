import dotenv from 'dotenv';

// Load server-side environment variables for the Express process.
// Vite loads .env.local automatically for the browser bundle, but tsx/server.ts does not.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });
