import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function dadosGraficos(req: Request, res: Response) {
  const { tecnico, tipo, marca, data_inicio, data_fim } = req.query;

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
    const porTecnico = await pool.query(
      `SELECT tecnico_nome, COUNT(*) as total FROM devolucoes ${whereClause}
       GROUP BY tecnico_nome ORDER BY total DESC`,
      valores
    );

    const porTipo = await pool.query(
      `SELECT equipamento_tipo, COUNT(*) as total FROM devolucoes ${whereClause}
       GROUP BY equipamento_tipo ORDER BY total DESC`,
      valores
    );

    const porMarca = await pool.query(
      `SELECT equipamento_marca, COUNT(*) as total FROM devolucoes ${whereClause}
       GROUP BY equipamento_marca ORDER BY total DESC`,
      valores
    );

    res.json({
      porTecnico: porTecnico.rows,
      porTipo: porTipo.rows,
      porMarca: porMarca.rows,
    });
  } catch (err) {
    console.error('Erro ao gerar dados de gráficos:', err);
    res.status(500).json({ mensagem: 'Erro interno ao gerar dados de gráficos' });
  }
}