// Check Excel file raw data structure
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const excelPath = path.join(process.cwd(), 'docs', 'Comprehensive_Dog_Cat_Breed_Database.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);

// Check Dog Breeds sheet raw
console.log('=== Dog Breeds Sheet (First 10 rows) ===\n');
const dogSheet = workbook.Sheets['Dog Breeds'];
const dogRange = XLSX.utils.decode_range(dogSheet['!ref'] || 'A1:Z100');

for (let row = dogRange.s.r; row <= Math.min(dogRange.s.r + 15, dogRange.e.r); row++) {
  const rowData: string[] = [];
  for (let col = dogRange.s.c; col <= Math.min(dogRange.s.c + 10, dogRange.e.c); col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = dogSheet[cellAddress];
    rowData.push(cell ? String(cell.v).substring(0, 30) : '');
  }
  console.log(`Row ${row}: [${rowData.join(' | ')}]`);
}
