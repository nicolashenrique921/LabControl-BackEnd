import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function listarDevolucoesSemTeste(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT d.id, d.tecnico_nome, d.equipamento_marca, d.equipamento_tipo,
              d.descricao, d.mac, d.os, d.data_devolucao
       FROM devolucoes d
       LEFT JOIN testes t ON t.devolucao_id = d.id
       WHERE t.id IS NULL
       ORDER BY d.data_devolucao DESC`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar devoluções sem teste:', err);
    res.status(500).json({ mensagem: 'Erro interno ao listar devoluções sem teste' });
  }
}

export async function criarTeste(req: Request, res: Response) {
  const { devolucao_id, data_teste, avaliacao, observacao } = req.body;

  if (!devolucao_id || !data_teste || !avaliacao) {
    return res.status(400).json({
      mensagem: 'Devolução, data do teste e avaliação são obrigatórios',
    });
  }

  if (!['confirmado', 'nao_confirmado', 'inconclusivo'].includes(avaliacao)) {
    return res.status(400).json({ mensagem: 'Avaliação inválida' });
  }

  try {
    const devolucaoResult = await pool.query(
      `SELECT tecnico_nome, equipamento_marca, equipamento_tipo, descricao, mac, os, data_devolucao
       FROM devolucoes WHERE id = $1`,
      [devolucao_id]
    );

    if (devolucaoResult.rows.length === 0) {
      return res.status(400).json({ mensagem: 'Devolução não encontrada' });
    }

    const dev = devolucaoResult.rows[0];

    const resultado = await pool.query(
      `INSERT INTO testes
        (devolucao_id, tecnico_nome, equipamento_marca, equipamento_tipo, descricao_defeito, mac, os, data_devolucao, data_teste, avaliacao, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        devolucao_id,
        dev.tecnico_nome,
        dev.equipamento_marca,
        dev.equipamento_tipo,
        dev.descricao,
        dev.mac,
        dev.os,
        dev.data_devolucao,
        data_teste,
        avaliacao,
        observacao || null,
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ mensagem: 'Essa devolução já possui um teste registrado' });
    }
    console.error('Erro ao criar teste:', err);
    res.status(500).json({ mensagem: 'Erro interno ao registrar teste' });
  }
}

export async function consultarTestes(req: Request, res: Response) {
  const { tecnico, tipo, marca, mac, os, avaliacao, data_inicio, data_fim } = req.query;

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
  if (avaliacao) {
    condicoes.push(`avaliacao = $${indice}`);
    valores.push(avaliacao);
    indice++;
  }
  if (data_inicio) {
    condicoes.push(`data_teste >= $${indice}`);
    valores.push(data_inicio);
    indice++;
  }
  if (data_fim) {
    condicoes.push(`data_teste <= $${indice}`);
    valores.push(data_fim);
    indice++;
  }

  const whereClause = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT * FROM testes ${whereClause} ORDER BY data_teste DESC, id DESC`,
      valores
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao consultar testes:', err);
    res.status(500).json({ mensagem: 'Erro interno ao consultar testes' });
  }
}

export async function atualizarTeste(req: Request, res: Response) {
  const { id } = req.params;
  const { data_teste, avaliacao, observacao } = req.body;

  if (!data_teste || !avaliacao) {
    return res.status(400).json({ mensagem: 'Data do teste e avaliação são obrigatórios' });
  }

  if (!['confirmado', 'nao_confirmado', 'inconclusivo'].includes(avaliacao)) {
    return res.status(400).json({ mensagem: 'Avaliação inválida' });
  }

  try {
    const resultado = await pool.query(
      `UPDATE testes SET data_teste = $1, avaliacao = $2, observacao = $3
       WHERE id = $4
       RETURNING *`,
      [data_teste, avaliacao, observacao || null, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Teste não encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar teste:', err);
    res.status(500).json({ mensagem: 'Erro interno ao atualizar teste' });
  }
}

export async function excluirTeste(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM testes WHERE id = $1 RETURNING id', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Teste não encontrado' });
    }

    res.json({ mensagem: 'Teste excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir teste:', err);
    res.status(500).json({ mensagem: 'Erro interno ao excluir teste' });
  }
}

export async function dadosGraficosTestes(req: Request, res: Response) {
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
    condicoes.push(`data_teste >= $${indice}`);
    valores.push(data_inicio);
    indice++;
  }
  if (data_fim) {
    condicoes.push(`data_teste <= $${indice}`);
    valores.push(data_fim);
    indice++;
  }

  const whereClause = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT avaliacao, COUNT(*) as total FROM testes ${whereClause} GROUP BY avaliacao`,
      valores
    );

    const base = { confirmado: 0, nao_confirmado: 0, inconclusivo: 0 };
    resultado.rows.forEach((linha) => {
      base[linha.avaliacao as keyof typeof base] = Number(linha.total);
    });

    res.json(base);
  } catch (err) {
    console.error('Erro ao gerar dados de gráficos de testes:', err);
    res.status(500).json({ mensagem: 'Erro interno ao gerar dados de gráficos' });
  }
}