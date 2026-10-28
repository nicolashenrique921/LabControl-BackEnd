import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { gerarToken } from '../utils/jwt';

const MAX_TENTATIVAS = 3;
const BLOQUEIO_SEGUNDOS = 60;

export async function login(req: Request, res: Response) {
  const { username, senha } = req.body;

  if (!username || !senha) {
    return res.status(400).json({ mensagem: 'Usuário e senha são obrigatórios' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, username, senha_hash, perfil, tentativas_falhas, bloqueado_ate FROM usuarios WHERE username = $1',
      [username]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário ou senha inválidos' });
    }

    const usuario = resultado.rows[0];

    // Verifica se está bloqueado
    if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
      const segundosRestantes = Math.ceil(
        (new Date(usuario.bloqueado_ate).getTime() - Date.now()) / 1000
      );
      return res.status(429).json({
        mensagem: 'Muitas tentativas. Tente novamente em instantes.',
        bloqueado: true,
        segundos_restantes: segundosRestantes,
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const novasTentativas = usuario.tentativas_falhas + 1;

      if (novasTentativas >= MAX_TENTATIVAS) {
        const bloqueadoAte = new Date(Date.now() + BLOQUEIO_SEGUNDOS * 1000);
        await pool.query(
          'UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = $1 WHERE id = $2',
          [bloqueadoAte, usuario.id]
        );
        return res.status(429).json({
          mensagem: 'Muitas tentativas. Tente novamente em instantes.',
          bloqueado: true,
          segundos_restantes: BLOQUEIO_SEGUNDOS,
        });
      }

      await pool.query('UPDATE usuarios SET tentativas_falhas = $1 WHERE id = $2', [
        novasTentativas,
        usuario.id,
      ]);

      return res.status(401).json({
        mensagem: 'Usuário ou senha inválidos',
        tentativas_restantes: MAX_TENTATIVAS - novasTentativas,
      });
    }

    // Login certo: zera o contador
    await pool.query('UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = $1', [
      usuario.id,
    ]);

    const token = gerarToken({
      id: usuario.id,
      username: usuario.username,
      perfil: usuario.perfil,
    });

    return res.json({
      token,
      usuario: { id: usuario.id, username: usuario.username, perfil: usuario.perfil },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ mensagem: 'Erro interno ao processar login' });
  }
}