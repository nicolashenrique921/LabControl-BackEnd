import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import {
  listarDevolucoesSemTeste,
  criarTeste,
  consultarTestes,
  atualizarTeste,
  excluirTeste,
} from '../controllers/testeController';
import { exportarTestesExcel, exportarTestesPDF } from '../controllers/exportacaoTesteController';
import { /* ...os que já tem... */ dadosGraficosTestes } from '../controllers/testeController';
import {
  alternarFixarNota,
  reordenarNotas,
  excluirNota,
  listarNotas,
  buscarNota,
  criarNota,
  atualizarNota
} from '../controllers/notaController';

const router = Router();

router.use(autenticar);

router.get('/exportar/excel', exportarTestesExcel);
router.get('/exportar/pdf', exportarTestesPDF);
router.get('/sem-teste', listarDevolucoesSemTeste);
router.get('/graficos', dadosGraficosTestes);

router.get('/', consultarTestes);
router.post('/', criarTeste);
router.put('/:id', atualizarTeste);
router.delete('/:id', excluirTeste);

router.get('/', listarNotas);
router.post('/', criarNota);
router.put('/reordenar', reordenarNotas);
router.get('/:id', buscarNota);
router.put('/:id', atualizarNota);
router.put('/:id/fixar', alternarFixarNota);
router.delete('/:id', excluirNota);

export default router;
