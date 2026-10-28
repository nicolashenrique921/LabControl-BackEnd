import { Response, NextFunction } from 'express';
import { RequestComUsuario } from './authMiddleware';

export function exigirAdmin(req: RequestComUsuario, res: Response, next: NextFunction) {
  if (req.usuario?.perfil !== 'admin') {
    return res.status(403).json({ mensagem: 'Acesso restrito ao administrador' });
  }
  next();
}