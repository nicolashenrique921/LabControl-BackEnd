import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function criarDevolucao(req: Request, res: Response) {
  const { mac, os, tecnico_id, equipamento_id, data_devolucao, descricao } = req.body;

  if (!tecnico_id || !equipamento_id || !data_devolucao) {
    return res.status(400).json({
      mensagem: 'Técnico, equipamento e data de devolução são obrigatórios',
    });
  }

  const client = await pool.connect();
  try {
    // Busca o nome do técnico e marca/tipo do equipamento pra gravar o snapshot
    const tecnicoResult = await client.query('SELECT nome FROM tecnicos WHERE id = $1', [tecnico_id]);
    if (tecnicoResult.rows.length === 0) {
      return res.status(400).json({ mensagem: 'Técnico não encontrado' });
    }

    const equipamentoResult = await client.query(
      'SELECT marca, tipo FROM equipamentos WHERE id = $1',
      [equipamento_id]
    );
    if (equipamentoResult.rows.length === 0) {
      return res.status(400).json({ mensagem: 'Equipamento não encontrado' });
    }

    const tecnicoNome = tecnicoResult.rows[0].nome;
    const { marca, tipo } = equipamentoResult.rows[0];

    // mac e os sempre em maiúsculo, garantido no backend
    const macFormatado = mac ? String(mac).trim().toUpperCase() : null;
    const osFormatado = os ? String(os).trim().toUpperCase() : null;

    const resultado = await client.query(
      `INSERT INTO devolucoes
        (mac, os, tecnico_id, tecnico_nome, equipamento_id, equipamento_marca, equipamento_tipo, data_devolucao, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [macFormatado, osFormatado, tecnico_id, tecnicoNome, equipamento_id, marca, tipo, data_devolucao, descricao || null]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar devolução:', err);
    res.status(500).json({ mensagem: 'Erro interno ao registrar devolução' });
  } finally {
    client.release();
  }
}

export async function consultarDevolucoes(req: Request, res: Response) {
  const { tecnico, tipo, marca, mac, os, data_inicio, data_fim } = req.query;

  const condicoes: string[] = [];
  const valores: any[] = [];
  let indice = 1;

  if (tecnico) {
    condicoes.push(`tecnico_nome ILIKE $${indice}`);
    valores.push(`%${tecnico}%`);
    indice++;
  }
  if (tipo) {
    condicoes.push(`equipamento_tipo ILIKE $${indice}`);
    valores.push(`%${tipo}%`);
    indice++;
  }
  if (marca) {
    condicoes.push(`equipamento_marca ILIKE $${indice}`);
    valores.push(`%${marca}%`);
    indice++;
  }
  if (mac) {
    condicoes.push(`mac ILIKE $${indice}`);
    valores.push(`%${mac}%`);
    indice++;
  }
  if (os) {
    condicoes.push(`os ILIKE $${indice}`);
    valores.push(`%${os}%`);
    indice++;
  }
  if (data_inicio) {
    condicoes.push(`data_devolucao >= $${indice}`);
    valores.push(data_inicio);
    indice++;
  }
  if (data_fim) {
    condicoes.push(`data_devolucao <= $${indice}`);
    valores.push(data_fim);
    indice++;
  }

  const whereClause = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT * FROM devolucoes ${whereClause} ORDER BY data_devolucao DESC, id DESC`,
      valores
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao consultar devoluções:', err);
    res.status(500).json({ mensagem: 'Erro interno ao consultar devoluções' });
  }
}

export async function atualizarDevolucao(req: Request, res: Response) {
  const { id } = req.params;
  const { mac, os, tecnico_id, equipamento_id, data_devolucao, descricao } = req.body;

  if (!tecnico_id || !equipamento_id || !data_devolucao) {
    return res.status(400).json({
      mensagem: 'Técnico, equipamento e data de devolução são obrigatórios',
    });
  }

  const client = await pool.connect();
  try {
    const tecnicoResult = await client.query('SELECT nome FROM tecnicos WHERE id = $1', [tecnico_id]);
    if (tecnicoResult.rows.length === 0) {
      return res.status(400).json({ mensagem: 'Técnico não encontrado' });
    }

    const equipamentoResult = await client.query(
      'SELECT marca, tipo FROM equipamentos WHERE id = $1',
      [equipamento_id]
    );
    if (equipamentoResult.rows.length === 0) {
      return res.status(400).json({ mensagem: 'Equipamento não encontrado' });
    }

    const tecnicoNome = tecnicoResult.rows[0].nome;
    const { marca, tipo } = equipamentoResult.rows[0];

    const macFormatado = mac ? String(mac).trim().toUpperCase() : null;
    const osFormatado = os ? String(os).trim().toUpperCase() : null;

    const resultado = await client.query(
      `UPDATE devolucoes SET
        mac = $1, os = $2, tecnico_id = $3, tecnico_nome = $4,
        equipamento_id = $5, equipamento_marca = $6, equipamento_tipo = $7,
        data_devolucao = $8, descricao = $9
       WHERE id = $10
       RETURNING *`,
      [macFormatado, osFormatado, tecnico_id, tecnicoNome, equipamento_id, marca, tipo, data_devolucao, descricao || null, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Devolução não encontrada' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar devolução:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar devolução' });
  } finally {
    client.release();
  }
}

export async function excluirDevolucao(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM devolucoes WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Devolução não encontrada' });
    }

    res.json({ mensagem: 'Devolução excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir devolução:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir devolução' });
  }
}