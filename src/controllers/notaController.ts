import { Response } from 'express';
import { pool } from '../config/database';
import { RequestComUsuario } from '../middlewares/authMiddleware';

export async function listarNotas(req: RequestComUsuario, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT id, titulo, fixada, ordem, atualizado_em FROM notas
       WHERE usuario_id = $1
       ORDER BY fixada DESC, ordem ASC, atualizado_em DESC`,
      [req.usuario!.id]
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar notas:', err);
    res.status(500).json({ mensagem: 'Erro interno ao listar notas' });
  }
}

export async function buscarNota(req: RequestComUsuario, res: Response) {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `SELECT * FROM notas WHERE id = $1 AND usuario_id = $2`,
      [id, req.usuario!.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Nota não encontrada' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar nota:', err);
    res.status(500).json({ mensagem: 'Erro interno ao buscar nota' });
  }
}

export async function criarNota(req: RequestComUsuario, res: Response) {
  try {
    const ordemResult = await pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 as proxima_ordem FROM notas WHERE usuario_id = $1`,
      [req.usuario!.id]
    );
    const proximaOrdem = ordemResult.rows[0].proxima_ordem;

    const resultado = await pool.query(
      `INSERT INTO notas (usuario_id, titulo, conteudo, ordem) VALUES ($1, 'Nova nota', '', $2) RETURNING *`,
      [req.usuario!.id, proximaOrdem]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar nota:', err);
    res.status(500).json({ mensagem: 'Erro interno ao criar nota' });
  }
}

export async function atualizarNota(req: RequestComUsuario, res: Response) {
  const { id } = req.params;
  const { titulo, conteudo } = req.body;

  try {
    const resultado = await pool.query(
      `UPDATE notas SET titulo = $1, conteudo = $2, atualizado_em = NOW()
       WHERE id = $3 AND usuario_id = $4
       RETURNING *`,
      [titulo ?? 'Nova nota', conteudo ?? '', id, req.usuario!.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Nota não encontrada' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar nota:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar nota' });
  }
}

export async function alternarFixarNota(req: RequestComUsuario, res: Response) {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `UPDATE notas SET fixada = NOT fixada
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, titulo, fixada, ordem, atualizado_em`,
      [id, req.usuario!.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Nota não encontrada' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao fixar/desafixar nota:', err);
    res.status(500).json({ mensagem: 'Erro interno ao fixar/desafixar nota' });
  }
}

export async function reordenarNotas(req: RequestComUsuario, res: Response) {
  const { ordens } = req.body; // [{ id: number, ordem: number }, ...]

  if (!Array.isArray(ordens)) {
    return res.status(400).json({ mensagem: 'Formato inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of ordens) {
      await client.query(
        `UPDATE notas SET ordem = $1 WHERE id = $2 AND usuario_id = $3`,
        [item.ordem, item.id, req.usuario!.id]
      );
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Ordem atualizada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao reordenar notas:', err);
    res.status(500).json({ mensagem: 'Erro interno ao reordenar notas' });
  } finally {
    client.release();
  }
}

export async function excluirNota(req: RequestComUsuario, res: Response) {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `DELETE FROM notas WHERE id = $1 AND usuario_id = $2 RETURNING id`,
      [id, req.usuario!.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Nota não encontrada' });
    }
    res.json({ mensagem: 'Nota excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir nota:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir nota' });
  }
}