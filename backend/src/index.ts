import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';


dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});