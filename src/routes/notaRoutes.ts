import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import {
  listarNotas,
  buscarNota,
  criarNota,
  atualizarNota,
  excluirNota,
} from '../controllers/notaController';

const router = Router();

router.use(autenticar);

router.get('/', listarNotas);
router.post('/', criarNota);
router.get('/:id', buscarNota);
router.put('/:id', atualizarNota);
router.delete('/:id', excluirNota);

export default router;