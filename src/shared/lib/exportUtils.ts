import ExcelJS from 'exceljs';

type ExportCellValue = string | number | boolean | null | undefined;
type WorksheetCellValue = Exclude<ExportCellValue, null | undefined>;

function normalizeCellValue(value: unknown): WorksheetCellValue {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

export interface ExportColumn<T> {
  header: string;
  key: keyof T | ((item: T) => ExportCellValue);
}

export async function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data currently available to export.');
    return;
  }

  const rows = data.map((item) => {
    const row: Record<string, WorksheetCellValue> = {};
    columns.forEach((column) => {
      const value = typeof column.key === 'function'
        ? column.key(item)
        : item[column.key];

      row[column.header] = normalizeCellValue(value);
    });
    return row;
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: 18,
  }));
  worksheet.addRows(rows);

  // Auto-fit column widths
  worksheet.columns.forEach((column) => {
    const headerStr = column.header ? String(column.header) : '';
    const values = [headerStr, ...rows.map((row) => (headerStr ? (row as Record<string, any>)[headerStr] : ''))];
    const width = Math.max(...values.map((value) => String(value ?? '').length), 10);
    column.width = Math.min(width + 2, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
