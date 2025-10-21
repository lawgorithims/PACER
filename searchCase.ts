import { PacerCaseSearch } from './src/index.js';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx searchCase.ts <case-number> <court-id> [output-file]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx searchCase.ts 22-cv-00406 nmdc');
  console.log('  npx tsx searchCase.ts 25-cv-03951 mndc minnesota-case-results.json');
  console.log('');
  console.log('Common Court IDs:');
  console.log('  nmdc - New Mexico District Court');
  console.log('  mndc - Minnesota District Court');
  console.log('  cand - California Northern District');
  console.log('  nyed - New York Eastern District');
  console.log('  nynd - New York Northern District');
  console.log('  cacd - California Central District');
  console.log('  flmd - Florida Middle District');
  process.exit(1);
}

const caseNumber = args[0];
const courtId = args[1];
const outputFile = args[2] || 'case-results.json';

console.log(`Searching for case: ${caseNumber} in court: ${courtId}`);

// Read the token from the file we saved earlier
const token = readFileSync('token.txt', 'utf-8').trim();

const caseSearch = new PacerCaseSearch('production');

// Search by full case number in specific court(s)
async function runSearch() {
  try {
    await caseSearch.searchAndSave(
      token,
      {
        caseNumberFull: caseNumber,
        courtId: [courtId]
      },
      outputFile
    );
    console.log(`Search completed. Results saved to ${outputFile}`);
  } catch (error) {
    console.error('Search failed:', error);
    process.exit(1);
  }
}

runSearch();

