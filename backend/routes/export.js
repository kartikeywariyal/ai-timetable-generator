const express = require('express');
const auth = require('../middleware/auth');
const Timetable = require('../models/Timetable');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const router = express.Router();

router.get('/:id/excel', auth, async (req, res) => {
  try {
    const WeeklyTimetable = require('../models/WeeklyTimetable');
    let tt = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (!tt) {
      tt = await WeeklyTimetable.findOne({ _id: req.params.id, createdBy: req.user.id })
        .populate('entries.class entries.subject entries.teacher entries.classroom');
      if (tt && !tt.name) tt.name = `Week_${tt.weekNumber}_Timetable`;
    }
    if (!tt) return res.status(404).json({ message: 'Not found' });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ChronoGen';
    workbook.lastModifiedBy = 'ChronoGen';
    workbook.created = new Date();

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Parameter', key: 'param', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    summarySheet.addRows([
      ['Timetable Name', tt.name],
      ['Fitness Score', `${tt.fitnessScore}%`],
      ['Generation', tt.generation],
      ['Population Size', tt.constraints?.populationSize || 50],
      ['Max Generations', tt.constraints?.maxGenerations || 200],
      ['Mutation Rate', tt.constraints?.mutationRate || 0.1],
      ['Crossover Rate', tt.constraints?.crossoverRate || 0.8],
      ['Status', tt.status.toUpperCase()],
      ['Generated On', new Date(tt.createdAt).toLocaleString()]
    ]);

    // Style Summary Sheet
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 2. Class Timetables
    const byClass = {};
    for (const e of tt.entries) {
      const key = e.class?.name || 'Unknown';
      if (!byClass[key]) byClass[key] = [];
      byClass[key].push(e);
    }

    for (const [className, entries] of Object.entries(byClass)) {
      const sheet = workbook.addWorksheet(className);
      const days = [...new Set(entries.map(e => e.day))].sort((a, b) => {
        const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return order.indexOf(a) - order.indexOf(b);
      });
      const periods = [...new Set(entries.map(e => e.period))].sort((a, b) => a - b);

      // Header Row
      const headerRow = sheet.addRow(['Period/Day', ...days]);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EAD3' }
      };

      for (const period of periods) {
        const rowData = [`Period ${period}`];
        for (const day of days) {
          const entry = entries.find(e => e.day === day && e.period === period);
          if (entry) {
            rowData.push(`${entry.subject?.name || ''}\n${entry.teacher?.name || ''}\n[${entry.classroom?.name || 'No Room'}]`);
          } else {
            rowData.push('-');
          }
        }
        const row = sheet.addRow(rowData);
        row.height = 45; // Taller rows for multi-line text
        row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }

      // Column widths
      sheet.getColumn(1).width = 15;
      for (let i = 2; i <= days.length + 1; i++) {
        sheet.getColumn(i).width = 25;
      }

      // Add borders to all cells
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${tt.name.replace(/\s+/g, '_')}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ message: 'Error generating Excel file' });
  }
});

router.get('/:id/pdf', auth, async (req, res) => {
  const WeeklyTimetable = require('../models/WeeklyTimetable');
  let tt = await Timetable.findOne({ _id: req.params.id, createdBy: req.user.id })
    .populate('entries.class entries.subject entries.teacher entries.classroom');
  if (!tt) {
    tt = await WeeklyTimetable.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('entries.class entries.subject entries.teacher entries.classroom');
    if (tt && !tt.name) tt.name = `Week ${tt.weekNumber} Timetable`;
  }
  if (!tt) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=timetable.pdf');
  doc.pipe(res);

  doc.fontSize(16).text('ChronoGen - Timetable', { align: 'center' });
  doc.fontSize(10).text(`Fitness Score: ${tt.fitnessScore}% | Generated: ${new Date(tt.createdAt).toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  const byClass = {};
  for (const e of tt.entries) {
    const key = e.class?.name || 'Unknown';
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push(e);
  }

  for (const [className, entries] of Object.entries(byClass)) {
    doc.fontSize(12).text(`Class: ${className}`, { underline: true });
    doc.moveDown(0.3);

    const days = [...new Set(entries.map(e => e.day))].sort();
    const periods = [...new Set(entries.map(e => e.period))].sort((a, b) => a - b);

    const colW = 100;
    const rowH = 30;
    let x = doc.x;
    let y = doc.y;

    // Header
    doc.fontSize(8).text('Period', x, y, { width: 50 });
    days.forEach((d, i) => doc.text(d, x + 50 + i * colW, y, { width: colW }));
    y += rowH;

    for (const period of periods) {
      doc.text(`P${period}`, x, y, { width: 50 });
      days.forEach((d, i) => {
        const entry = entries.find(e => e.day === d && e.period === period);
        const text = entry ? `${entry.subject?.name || ''} (${entry.teacher?.name || ''})` : '-';
        doc.text(text, x + 50 + i * colW, y, { width: colW });
      });
      y += rowH;
      if (y > 500) { doc.addPage({ layout: 'landscape' }); y = 50; }
    }
    doc.moveDown(2);
  }

  doc.end();
});

module.exports = router;
