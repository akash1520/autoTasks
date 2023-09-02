import express, { Express } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import './calender'; // Assuming you've converted this to calender.ts
import { router } from './routes/auth'; // Assuming you've converted related files to .ts
import { router as homeRouter } from './routes/home'; 

dotenv.config();

const app: Express = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(homeRouter)
app.use(router);

const PORT: number = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

export default app;