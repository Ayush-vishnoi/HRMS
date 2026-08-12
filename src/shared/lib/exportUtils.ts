import * as XLSX from 'xlsx';

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

export function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string, sheetName: string = 'Sheet1') {
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

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const max_width = rows.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  worksheet['!cols'] = Array(max_width).fill({ wch: 18 });

  XLSX.writeFile(workbook, filename);
}
