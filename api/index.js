import express from 'express';
import cors from 'cors';
import routes from '../server/routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

app.use('/api', routes);

export default app;
