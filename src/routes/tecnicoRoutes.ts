import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import {
  listarTecnicos,
  criarTecnico,
  atualizarTecnico,
  excluirTecnico,
} from '../controllers/tecnicoController';

const router = Router();

router.use(autenticar); // exige login, qualquer perfil

router.get('/', listarTecnicos);
router.post('/', criarTecnico);
router.put('/:id', atualizarTecnico);
router.delete('/:id', excluirTecnico);

export default router;