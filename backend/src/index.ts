import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import userRoutes from '@/routes/userRoutes.js';


dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

app.use('/api/users',userRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});