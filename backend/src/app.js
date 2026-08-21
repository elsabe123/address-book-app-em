import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createStore } from './data/store.js';
import { createContactsRouter } from './routes/contacts.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allows integration tests to point the store at an isolated temp file
// instead of the real backend/data/contacts.json.
const defaultDataFile = path.join(__dirname, '..', 'data', 'contacts.json');
const dataFile = process.env.CONTACTS_DATA_FILE || defaultDataFile;

const store = createStore(dataFile);

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/contacts', createContactsRouter(store));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
