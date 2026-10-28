import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../config/database';

function montarFiltros(query: any) {
  const { tecnico, tipo, marca, mac, os, data_inicio, data_fim } = query;
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
  return { whereClause, valores };
}

export async function exportarExcel(req: Request, res: Response) {
  try {
    const { whereClause, valores } = montarFiltros(req.query);
    const resultado = await pool.query(
      `SELECT mac, os, tecnico_nome, equipamento_marca, equipamento_tipo, data_devolucao, descricao
       FROM devolucoes ${whereClause} ORDER BY data_devolucao DESC`,
      valores
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Devoluções');

    sheet.columns = [
      { header: 'MAC', key: 'mac', width: 20 },
      { header: 'OS', key: 'os', width: 20 },
      { header: 'Técnico', key: 'tecnico_nome', width: 25 },
      { header: 'Marca', key: 'equipamento_marca', width: 15 },
      { header: 'Tipo', key: 'equipamento_tipo', width: 15 },
      { header: 'Data', key: 'data_devolucao', width: 15 },
      { header: 'Descrição', key: 'descricao', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };

    resultado.rows.forEach((linha) => {
      sheet.addRow({
        mac: linha.mac,
        os: linha.os,
        tecnico_nome: linha.tecnico_nome,
        equipamento_marca: linha.equipamento_marca,
        equipamento_tipo: linha.equipamento_tipo,
        data_devolucao: new Date(linha.data_devolucao).toLocaleDateString('pt-BR'),
        descricao: linha.descricao,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=devolucoes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar Excel:', err);
    res.status(500).json({ mensagem: 'Erro interno ao exportar Excel' });
  }
}

export async function exportarPDF(req: Request, res: Response) {
  try {
    const { whereClause, valores } = montarFiltros(req.query);
    const resultado = await pool.query(
      `SELECT mac, os, tecnico_nome, equipamento_marca, equipamento_tipo, data_devolucao, descricao
       FROM devolucoes ${whereClause} ORDER BY data_devolucao DESC`,
      valores
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=devolucoes.pdf');

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(16).text('Relatório de Devoluções - Lab Control', { align: 'center' });
    doc.moveDown();

    const colunas = ['MAC', 'OS', 'Técnico', 'Marca', 'Tipo', 'Data', 'Descrição'];
    const larguras = [90, 90, 120, 90, 80, 70, 200];
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
        linha.mac || '-',
        linha.os || '-',
        linha.tecnico_nome,
        linha.equipamento_marca,
        linha.equipamento_tipo,
        new Date(linha.data_devolucao).toLocaleDateString('pt-BR'),
        linha.descricao || '-',
      ];
      valoresLinha.forEach((valor, i) => {
        doc.text(String(valor), x, y, { width: larguras[i] });
        x += larguras[i];
      });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    res.status(500).json({ mensagem: 'Erro interno ao exportar PDF' });
  }
}