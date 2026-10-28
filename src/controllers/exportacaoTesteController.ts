import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../config/database';

function montarFiltrosTeste(query: any) {
  const { tecnico, tipo, marca, mac, os, avaliacao, data_inicio, data_fim } = query;
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
  return { whereClause, valores };
}

const LABEL_AVALIACAO: Record<string, string> = {
  confirmado: 'Confirmado',
  nao_confirmado: 'Não Confirmado',
  inconclusivo: 'Inconclusivo',
};

export async function exportarTestesExcel(req: Request, res: Response) {
  try {
    const { whereClause, valores } = montarFiltrosTeste(req.query);
    const resultado = await pool.query(
      `SELECT tecnico_nome, equipamento_marca, equipamento_tipo, descricao_defeito,
              mac, os, data_devolucao, data_teste, avaliacao, observacao
       FROM testes ${whereClause} ORDER BY data_teste DESC`,
      valores
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Testes');

    sheet.columns = [
      { header: 'Técnico', key: 'tecnico_nome', width: 25 },
      { header: 'Marca', key: 'equipamento_marca', width: 15 },
      { header: 'Tipo', key: 'equipamento_tipo', width: 15 },
      { header: 'Defeito Relatado', key: 'descricao_defeito', width: 30 },
      { header: 'MAC', key: 'mac', width: 20 },
      { header: 'OS', key: 'os', width: 20 },
      { header: 'Data Devolução', key: 'data_devolucao', width: 15 },
      { header: 'Data Teste', key: 'data_teste', width: 15 },
      { header: 'Avaliação', key: 'avaliacao', width: 18 },
      { header: 'Observação', key: 'observacao', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };

    resultado.rows.forEach((linha) => {
      sheet.addRow({
        tecnico_nome: linha.tecnico_nome,
        equipamento_marca: linha.equipamento_marca,
        equipamento_tipo: linha.equipamento_tipo,
        descricao_defeito: linha.descricao_defeito,
        mac: linha.mac,
        os: linha.os,
        data_devolucao: new Date(linha.data_devolucao).toLocaleDateString('pt-BR'),
        data_teste: new Date(linha.data_teste).toLocaleDateString('pt-BR'),
        avaliacao: LABEL_AVALIACAO[linha.avaliacao] || linha.avaliacao,
        observacao: linha.observacao,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=testes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar Excel de testes:', err);
    res.status(500).json({ mensagem: 'Erro interno ao exportar Excel' });
  }
}

export async function exportarTestesPDF(req: Request, res: Response) {
  try {
    const { whereClause, valores } = montarFiltrosTeste(req.query);
    const resultado = await pool.query(
      `SELECT tecnico_nome, equipamento_marca, equipamento_tipo, descricao_defeito,
              data_teste, avaliacao, observacao
       FROM testes ${whereClause} ORDER BY data_teste DESC`,
      valores
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=testes.pdf');

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(16).text('Relatório de Testes - Lab Control', { align: 'center' });
    doc.moveDown();

    const colunas = ['Técnico', 'Marca', 'Tipo', 'Defeito', 'Data Teste', 'Avaliação', 'Observação'];
    const larguras = [100, 80, 70, 160, 80, 90, 160];
    let y = doc.y;

    doc.fontSize(10).font('Helvetica-Bold');
    let x = doc.page.margins.left;
    colunas.forEach((coluna, i) => {
      doc.text(coluna, x, y, { width: larguras[i] });
      x += larguras[i];
    });

    doc.moveDown();
    doc.font('Helvetica');

    resultado.rows.forEach((linha) => {
      y = doc.y;
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      x = doc.page.margins.left;
      const valoresLinha = [
        linha.tecnico_nome,
        linha.equipamento_marca,
        linha.equipamento_tipo,
        linha.descricao_defeito || '-',
        new Date(linha.data_teste).toLocaleDateString('pt-BR'),
        LABEL_AVALIACAO[linha.avaliacao] || linha.avaliacao,
        linha.observacao || '-',
      ];
      valoresLinha.forEach((valor, i) => {
        doc.text(String(valor), x, y, { width: larguras[i] });
        x += larguras[i];
      });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Erro ao exportar PDF de testes:', err);
    res.status(500).json({ mensagem: 'Erro interno ao exportar PDF' });
  }
}