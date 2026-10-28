import { Request, Response, NextFunction } from 'express';
import { verificarToken, TokenPayload } from '../utils/jwt';

export interface RequestComUsuario extends Request {
  usuario?: TokenPayload;
}

export function autenticar(req: RequestComUsuario, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verificarToken(token);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
  }
}