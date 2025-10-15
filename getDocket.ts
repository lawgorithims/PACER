import { DocketScraper } from './src/index.js';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: npx tsx getDocket.ts <input-file> [output-file]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx getDocket.ts case-results.json');
  console.log('  npx tsx getDocket.ts minnesota-case-results.json minnesota-docket-data.json');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || 'docket-data.json';

// Read the case results
const caseResults = JSON.parse(readFileSync(inputFile, 'utf-8'));

// Get the first case's link
if (!caseResults.content || caseResults.content.length === 0) {
  console.error(`No cases found in ${inputFile}`);
  process.exit(1);
}

const firstCase = caseResults.content[0];
const caseLink = firstCase.caseLink;

console.log(`Case: ${firstCase.caseTitle}`);
console.log(`Link: ${caseLink}`);

// Get credentials from environment variables
const username = process.env.PACER_USERNAME || 'your_username';
const password = process.env.PACER_PASSWORD || 'your_password';

// Create scraper with PACER credentials
const scraper = new DocketScraper({
  username: username,
  password: password,
  headless: false  // Set to true to run without showing browser
});

try {
  // Initialize browser
  await scraper.init();

  // Get and save docket report
  await scraper.saveDocketData(caseLink, outputFile);

  console.log('Done!');
} catch (error) {
  console.error('Error:', error);
} finally {
  await scraper.close();
}

