import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function listarEquipamentos(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      'SELECT id, marca, tipo, criado_em FROM equipamentos ORDER BY marca, tipo'
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar equipamentos:', err);
    res.status(500).json({ mensagem: 'Erro interno ao listar equipamentos' });
  }
}

export async function criarEquipamento(req: Request, res: Response) {
  const { marca, tipo } = req.body;

  if (!marca || !marca.trim() || !tipo || !tipo.trim()) {
    return res.status(400).json({ mensagem: 'Marca e tipo são obrigatórios' });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO equipamentos (marca, tipo) VALUES ($1, $2) RETURNING id, marca, tipo, criado_em',
      [marca.trim(), tipo.trim()]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ mensagem: 'Essa combinação de marca e tipo já existe' });
    }
    console.error('Erro ao criar equipamento:', err);
    res.status(500).json({ mensagem: 'Erro interno ao criar equipamento' });
  }
}

export async function atualizarEquipamento(req: Request, res: Response) {
  const { id } = req.params;
  const { marca, tipo } = req.body;

  if (!marca || !marca.trim() || !tipo || !tipo.trim()) {
    return res.status(400).json({ mensagem: 'Marca e tipo são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      'UPDATE equipamentos SET marca = $1, tipo = $2 WHERE id = $3 RETURNING id, marca, tipo, criado_em',
      [marca.trim(), tipo.trim(), id]
    );

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    // Propaga marca/tipo atualizados para as devoluções já registradas
    await client.query(
      'UPDATE devolucoes SET equipamento_marca = $1, equipamento_tipo = $2 WHERE equipamento_id = $3',
      [marca.trim(), tipo.trim(), id]
    );

    await client.query('COMMIT');
    res.json(resultado.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ mensagem: 'Essa combinação de marca e tipo já existe' });
    }
    console.error('Erro ao atualizar equipamento:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar equipamento' });
  } finally {
    client.release();
  }
}

export async function excluirEquipamento(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM equipamentos WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    res.json({ mensagem: 'Equipamento excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir equipamento:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir equipamento' });
  }
}