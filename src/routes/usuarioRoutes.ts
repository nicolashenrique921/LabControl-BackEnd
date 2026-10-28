import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import { exigirAdmin } from '../middlewares/adminMiddleware';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
} from '../controllers/usuarioController';

const router = Router();

// Todas as rotas de usuários exigem login + perfil admin
router.use(autenticar, exigirAdmin);

router.get('/', listarUsuarios);
router.post('/', criarUsuario);
router.put('/:id', atualizarUsuario);
router.delete('/:id', excluirUsuario);

export default router;