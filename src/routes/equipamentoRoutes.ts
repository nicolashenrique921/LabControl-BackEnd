import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import {
  listarEquipamentos,
  criarEquipamento,
  atualizarEquipamento,
  excluirEquipamento,
} from '../controllers/equipamentoController';

const router = Router();

router.use(autenticar);

router.get('/', listarEquipamentos);
router.post('/', criarEquipamento);
router.put('/:id', atualizarEquipamento);
router.delete('/:id', excluirEquipamento);

export default router;