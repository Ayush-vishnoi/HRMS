import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  header: string;
  key: keyof T | ((item: T) => string | number | boolean | null | undefined);
}

export function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data currently available to export.');
    return;
  }

  // Map data to sheet rows
  const rows = data.map((item) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      let val: any;
      if (typeof col.key === 'function') {
        val = col.key(item);
      } else {
        val = item[col.key];
      }
      row[col.header] = val !== undefined && val !== null ? val : '';
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
