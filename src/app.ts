import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import tecnicoRoutes from './routes/tecnicoRoutes';
import equipamentoRoutes from './routes/equipamentoRoutes';
import devolucaoRoutes from './routes/devolucaoRoutes';
import testeRoutes from './routes/testeRoutes';
import notaRoutes from './routes/notaRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/tecnicos', tecnicoRoutes);
app.use('/api/equipamentos', equipamentoRoutes);
app.use('/api/devolucoes', devolucaoRoutes);
app.use('/api/testes', testeRoutes);
app.use('/api/notas', notaRoutes);

export default app;