// Check Excel file structure
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const excelPath = path.join(process.cwd(), 'docs', 'Comprehensive_Dog_Cat_Breed_Database.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);

console.log('Sheet names:', workbook.SheetNames);

// Check first sheet
for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`Row count: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0] as object));
    console.log('First row:', data[0]);
  }
}
