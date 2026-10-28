import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import {
  criarDevolucao,
  consultarDevolucoes,
  atualizarDevolucao,
  excluirDevolucao,
} from '../controllers/devolucaoController';
import { exportarExcel, exportarPDF } from '../controllers/exportacaoController';
import { dadosGraficos } from '../controllers/graficoController';

const router = Router();

router.use(autenticar);

router.get('/exportar/excel', exportarExcel);
router.get('/exportar/pdf', exportarPDF);
router.get('/graficos', dadosGraficos);

router.get('/', consultarDevolucoes);
router.post('/', criarDevolucao);
router.put('/:id', atualizarDevolucao);
router.delete('/:id', excluirDevolucao);

export default router;