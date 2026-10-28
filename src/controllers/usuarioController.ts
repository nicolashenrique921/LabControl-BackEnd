import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';

export async function listarUsuarios(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      'SELECT id, username, perfil, criado_em FROM usuarios ORDER BY username'
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ mensagem: 'Erro interno ao listar usuários' });
  }
}

export async function criarUsuario(req: Request, res: Response) {
  const { username, senha, perfil } = req.body;

  if (!username || !senha || !perfil) {
    return res.status(400).json({ mensagem: 'Username, senha e perfil são obrigatórios' });
  }

  if (perfil !== 'admin' && perfil !== 'usuario') {
    return res.status(400).json({ mensagem: 'Perfil deve ser "admin" ou "usuario"' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const resultado = await pool.query(
      'INSERT INTO usuarios (username, senha_hash, perfil) VALUES ($1, $2, $3) RETURNING id, username, perfil, criado_em',
      [username, senhaHash, perfil]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ mensagem: 'Username já existe' });
    }
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ mensagem: 'Erro interno ao criar usuário' });
  }
}

export async function atualizarUsuario(req: Request, res: Response) {
  const { id } = req.params;
  const { senha, perfil } = req.body;

  if (!senha && !perfil) {
    return res.status(400).json({ mensagem: 'Informe ao menos senha ou perfil para atualizar' });
  }

  try {
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);
      await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id]);
    }
    if (perfil) {
      if (perfil !== 'admin' && perfil !== 'usuario') {
        return res.status(400).json({ mensagem: 'Perfil deve ser "admin" ou "usuario"' });
      }
      await pool.query('UPDATE usuarios SET perfil = $1 WHERE id = $2', [perfil, id]);
    }

    const resultado = await pool.query(
      'SELECT id, username, perfil, criado_em FROM usuarios WHERE id = $1',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar usuário' });
  }
}

export async function excluirUsuario(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir usuário' });
  }
}