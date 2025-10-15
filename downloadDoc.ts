import { DocumentDownloader } from './src/index.js';
import { DocumentDownloaderMN } from './src/document-downloader-mn.js';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx downloadDoc.ts <docket-file> <document-number> [output-filename]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx downloadDoc.ts docket-data.json 3');
  console.log('  npx tsx downloadDoc.ts minnesota-docket-data.json 4 minnesota_doc_4.pdf');
  console.log('');
  console.log('Note: The script will automatically detect the court based on the case link');
  process.exit(1);
}

const docketFile = args[0];
const documentNumber = parseInt(args[1]);
const outputFilename = args[2] || `doc_${documentNumber}.pdf`;

// Read the docket data
const docketData = JSON.parse(readFileSync(docketFile, 'utf-8'));

// Find the document by number
const document = docketData.entries.find(entry => 
  entry.documentNumber === documentNumber.toString()
);

if (!document || !document.documentLink) {
  console.error(`Document #${documentNumber} not found or has no document link`);
  console.log('Available documents:');
  docketData.entries.forEach((entry, index) => {
    if (entry.documentNumber) {
      console.log(`  #${entry.documentNumber}: ${entry.docketText.substring(0, 80)}...`);
    }
  });
  process.exit(1);
}

console.log(`Document #${documentNumber}: ${document.docketText}`);
console.log(`Document Link: ${document.documentLink}`);

// Detect court based on the document link
const isMinnesota = document.documentLink.includes('mnd.uscourts.gov');
const isNewMexico = document.documentLink.includes('nmd.uscourts.gov');

console.log(`Detected court: ${isMinnesota ? 'Minnesota' : isNewMexico ? 'New Mexico' : 'Unknown'}`);

// Get credentials from environment variables
const username = process.env.PACER_USERNAME || 'your_username';
const password = process.env.PACER_PASSWORD || 'your_password';

// Create appropriate downloader
const downloaderOptions = {
  username: username,
  password: password,
  headless: false,
  downloadPath: './downloads'
};

const downloader = isMinnesota 
  ? new DocumentDownloaderMN(downloaderOptions)
  : new DocumentDownloader(downloaderOptions);

try {
  await downloader.init();
  
  const downloadedFile = await downloader.downloadDocument(
    document.documentLink,
    outputFilename
  );
  
  console.log(`Successfully downloaded: ${downloadedFile}`);
} catch (error) {
  console.error('Error:', error);
} finally {
  await downloader.close();
}