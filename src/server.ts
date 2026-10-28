import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { testarConexao } from './config/database';

const PORT = process.env.PORT || 3333;

async function iniciar() {
  await testarConexao();
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

iniciar();