import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function listarTecnicos(req: Request, res: Response) {
  try {
    const resultado = await pool.query('SELECT id, nome, criado_em FROM tecnicos ORDER BY nome');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar técnicos:', err);
    res.status(500).json({ mensagem: 'Erro interno ao listar técnicos' });
  }
}

export async function criarTecnico(req: Request, res: Response) {
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome do técnico é obrigatório' });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO tecnicos (nome) VALUES ($1) RETURNING id, nome, criado_em',
      [nome.trim()]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar técnico:', err);
    res.status(500).json({ mensagem: 'Erro interno ao criar técnico' });
  }
}

export async function atualizarTecnico(req: Request, res: Response) {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Nome do técnico é obrigatório' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      'UPDATE tecnicos SET nome = $1 WHERE id = $2 RETURNING id, nome, criado_em',
      [nome.trim(), id]
    );

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }

    // Propaga o novo nome para as devoluções já registradas com esse técnico
    await client.query(
      'UPDATE devolucoes SET tecnico_nome = $1 WHERE tecnico_id = $2',
      [nome.trim(), id]
    );

    await client.query('COMMIT');
    res.json(resultado.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar técnico:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar técnico' });
  } finally {
    client.release();
  }
}

export async function excluirTecnico(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // O ON DELETE SET NULL da FK já zera tecnico_id nas devoluções,
    // mantendo tecnico_nome como snapshot histórico.
    const resultado = await pool.query('DELETE FROM tecnicos WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Técnico não encontrado' });
    }

    res.json({ mensagem: 'Técnico excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir técnico:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir técnico' });
  }
}