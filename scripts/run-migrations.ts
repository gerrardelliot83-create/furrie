/**
 * Database Migration Script
 * Prints instructions for running SQL migrations via Supabase Dashboard.
 *
 * Usage: npx tsx scripts/run-migrations.ts
 *
 * Note: Supabase JS client doesn't support raw SQL execution.
 * Migration files should be run via Supabase Dashboard SQL Editor.
 */

import * as fs from 'fs';
import * as path from 'path';

// Alternative: Print SQL for manual execution
async function printMigrationInstructions() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('='.repeat(60));
  console.log('DATABASE MIGRATION INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\n1. Go to your Supabase Dashboard');
  console.log('2. Click "SQL Editor" in the sidebar');
  console.log('3. Run each migration file in order:\n');

  files.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });

  console.log('\n4. You can copy/paste the SQL from each file');
  console.log('   Location: supabase/migrations/\n');
  console.log('='.repeat(60));
}

printMigrationInstructions();
