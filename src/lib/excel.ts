import ExcelJS from 'exceljs';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;
export type ExcelRowValues = ExcelCellValue[];

export function addWorksheetFromRows(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: ExcelRowValues[],
  columnWidths?: number[]
) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.addRows(rows.map((row) => row.map((value) => value ?? '')));

  if (columnWidths) {
    worksheet.columns = columnWidths.map((width) => ({ width }));
  }

  return worksheet;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function loadWorkbookFromBuffer(buffer: ArrayBuffer | Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer =
    buffer instanceof ArrayBuffer
      ? Buffer.from(buffer)
      : Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const input = nodeBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0];

  await workbook.xlsx.load(input);

  return workbook;
}

export function getCellText(cell: ExcelJS.Cell) {
  const value = cell.value;

  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return cell.text;

  return String(value);
}

export function worksheetToObjects<T extends Record<string, unknown>>(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  const headers: Array<{ index: number; key: string }> = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const key = getCellText(cell).trim();
    if (key) {
      headers.push({ index: columnNumber, key });
    }
  });

  const rows: T[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const output: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach(({ index, key }) => {
      const text = getCellText(row.getCell(index));
      if (text !== '') {
        hasValue = true;
      }
      output[key] = text;
    });

    if (hasValue) {
      rows.push(output as T);
    }
  });

  return rows;
}