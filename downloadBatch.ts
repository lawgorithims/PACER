import { DocumentDownloader } from './src/index.js';
import { DocumentDownloaderMN } from './src/document-downloader-mn.js';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx downloadBatch.ts <docket-file> <document-numbers> [output-prefix]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx downloadBatch.ts docket-data.json 3,4,5');
  console.log('  npx tsx downloadBatch.ts minnesota-docket-data.json 1,2,3,4,5 minnesota_doc');
  console.log('  npx tsx downloadBatch.ts docket-data.json 3-7');
  console.log('  npx tsx downloadBatch.ts docket-data.json 1,3,5-8,10');
  console.log('');
  console.log('Document numbers can be:');
  console.log('  - Individual: 3,4,5');
  console.log('  - Ranges: 3-7 (downloads 3,4,5,6,7)');
  console.log('  - Mixed: 1,3,5-8,10 (downloads 1,3,5,6,7,8,10)');
  process.exit(1);
}

const docketFile = args[0];
const documentNumbersStr = args[1];
const outputPrefix = args[2] || 'doc';

// Parse document numbers (support ranges and individual numbers)
function parseDocumentNumbers(str: string): number[] {
  const numbers: number[] = [];
  const parts = str.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      // Handle range (e.g., "3-7")
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
    } else {
      // Handle individual number
      numbers.push(parseInt(trimmed));
    }
  }
  
  return numbers.sort((a, b) => a - b); // Sort for better user experience
}

const documentNumbers = parseDocumentNumbers(documentNumbersStr);

console.log(`Batch downloading documents: ${documentNumbers.join(', ')}`);

// Read the docket data
const docketData = JSON.parse(readFileSync(docketFile, 'utf-8'));

// Find all requested documents
const documents = documentNumbers.map(docNum => {
  const document = docketData.entries.find(entry => 
    entry.documentNumber === docNum.toString()
  );
  
  if (!document || !document.documentLink) {
    console.error(`❌ Document #${docNum} not found or has no document link`);
    return null;
  }
  
  return { number: docNum, document };
}).filter(Boolean);

if (documents.length === 0) {
  console.error('No valid documents found to download');
  console.log('Available documents:');
  docketData.entries.forEach((entry, index) => {
    if (entry.documentNumber) {
      console.log(`  #${entry.documentNumber}: ${entry.docketText.substring(0, 80)}...`);
    }
  });
  process.exit(1);
}

console.log(`Found ${documents.length} documents to download:`);
documents.forEach(({ number, document }) => {
  console.log(`  #${number}: ${document.docketText.substring(0, 60)}...`);
});

// Detect court based on the first document link
const firstDocument = documents[0].document;
const isMinnesota = firstDocument.documentLink.includes('mnd.uscourts.gov');
const isNewMexico = firstDocument.documentLink.includes('nmd.uscourts.gov');

console.log(`\nDetected court: ${isMinnesota ? 'Minnesota' : isNewMexico ? 'New Mexico' : 'Unknown'}`);

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
  console.log('\n🚀 Initializing downloader...');
  await downloader.init();
  
  const downloadedFiles: string[] = [];
  
  for (let i = 0; i < documents.length; i++) {
    const { number, document } = documents[i];
    const filename = `${outputPrefix}_${number}.pdf`;
    
    console.log(`\n📄 Downloading document #${number} (${i + 1}/${documents.length})...`);
    console.log(`   ${document.docketText.substring(0, 60)}...`);
    
    try {
      const downloadedFile = await downloader.downloadDocument(
        document.documentLink,
        filename
      );
      
      downloadedFiles.push(downloadedFile);
      console.log(`   ✅ Successfully downloaded: ${downloadedFile}`);
    } catch (error) {
      console.error(`   ❌ Failed to download document #${number}:`, error);
    }
  }
  
  console.log(`\n🎉 Batch download complete!`);
  console.log(`Downloaded ${downloadedFiles.length}/${documents.length} documents:`);
  downloadedFiles.forEach(file => console.log(`  - ${file}`));
  
} catch (error) {
  console.error('Error during batch download:', error);
} finally {
  await downloader.close();
}
