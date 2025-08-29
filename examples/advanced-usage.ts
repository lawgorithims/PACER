import { 
  PacerScraper, 
  FileManager, 
  createDateRangeQuery, 
  createDocumentInputCsv,
  createDocketUpdateCsv,
  createUcid,
  getCourtFromUcid,
  getCaseNumberFromUcid
} from '../src/index';

async function advancedUsageExample() {
  const scraper = new PacerScraper();
  const fileManager = new FileManager('demo/pacer');
  
  // Example 1: Custom query with specific nature of suit
  console.log('Example 1: Custom query with specific nature of suit...');
  const customQuery = {
    filed_from: '01/01/2020',
    filed_to: '12/31/2020',
    case_status: 'closed',
    nature_suit: '440 Civil Rights: Other',
    case_type: 'cv'
  };
  
  const queryResult = await scraper.runQueryScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    queryConfig: customQuery,
    queryPrefix: 'civil_rights_2020',
    caseLimit: 10,
    overrideTime: true
  });
  
  console.log('Custom query result:', queryResult);
  
  // Example 2: Docket scraper with member list handling
  console.log('\nExample 2: Docket scraper with member list handling...');
  const docketResult = await scraper.runDocketScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    docketInput: 'demo/pacer/psc/queries',
    docketMemList: 'avoid', // Avoid member lists to reduce costs
    docketExcludeParties: true, // Exclude parties to reduce page count
    caseLimit: 5,
    overrideTime: true
  });
  
  console.log('Docket result with optimizations:', docketResult);
  
  // Example 3: Document scraper with specific documents
  console.log('\nExample 3: Document scraper with specific documents...');
  
  // Create a document input CSV for specific documents
  const specificDocuments = [
    { ucid: 'psc;;1:07-cv-00431', docNos: ['2', '3:5', '6_1'] },
    { ucid: 'psc;;1:07-cv-00432', docNos: ['1', '4_1:3'] }
  ];
  
  createDocumentInputCsv(specificDocuments, 'specific_documents.csv');
  
  const documentResult = await scraper.runDocumentScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    documentInput: 'specific_documents.csv',
    documentAtt: true,
    documentSkipSeen: false, // Don't skip seen documents
    documentLimit: 500,
    caseLimit: 2,
    overrideTime: true
  });
  
  console.log('Specific documents result:', documentResult);
  
  // Example 4: Docket update for existing cases
  console.log('\nExample 4: Docket update for existing cases...');
  
  const updateCases = [
    { ucid: 'psc;;1:07-cv-00431', latestDate: '07/15/2007' },
    { ucid: 'psc;;1:07-cv-00432' }, // No date provided, will be calculated
    { ucid: 'psc;;1:07-cv-00433', latestDate: '07/20/2007' }
  ];
  
  createDocketUpdateCsv(updateCases, 'docket_update.csv');
  
  const updateResult = await scraper.runDocketScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    docketInput: 'docket_update.csv',
    docketUpdate: true,
    overrideTime: true
  });
  
  console.log('Docket update result:', updateResult);
  
  // Example 5: Summary scraper
  console.log('\nExample 5: Summary scraper...');
  const summaryResult = await scraper.runSummaryScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    summaryInput: 'demo/pacer/psc/queries',
    caseLimit: 3,
    overrideTime: true
  });
  
  console.log('Summary result:', summaryResult);
  
  // Example 6: Advanced file management
  console.log('\nExample 6: Advanced file management...');
  
  // Check if specific cases exist
  const testUcid = 'psc;;1:07-cv-00431';
  const court = getCourtFromUcid(testUcid);
  const caseNumber = getCaseNumberFromUcid(testUcid);
  
  console.log(`UCID: ${testUcid}`);
  console.log(`Court: ${court}`);
  console.log(`Case Number: ${caseNumber}`);
  
  const caseExists = fileManager.caseExists('psc', testUcid);
  const documentsExist = fileManager.documentsExist('psc', testUcid);
  
  console.log(`Case exists: ${caseExists}`);
  console.log(`Documents exist: ${documentsExist}`);
  
  // Get case information from JSON files
  const jsonFiles = fileManager.listJsonFiles('psc', '07');
  if (jsonFiles.length > 0) {
    const caseInfo = fileManager.getCaseInfo(jsonFiles[0]);
    console.log('Case info:', caseInfo);
    
    const docketEntries = fileManager.getDocketEntries(jsonFiles[0]);
    console.log(`Docket entries count: ${docketEntries.length}`);
    if (docketEntries.length > 0) {
      console.log('First docket entry:', docketEntries[0]);
    }
  }
  
  // Example 7: Batch processing with error handling
  console.log('\nExample 7: Batch processing with error handling...');
  
  const courts = ['psc']; // Add more courts as needed
  const results = [];
  
  for (const court of courts) {
    try {
      console.log(`Processing court: ${court}`);
      
      // Check if court directory exists
      const courtPath = fileManager.getCourtPath(court);
      if (!require('fs').existsSync(courtPath)) {
        console.log(`Court directory does not exist: ${courtPath}`);
        continue;
      }
      
      // Get statistics
      const queryFiles = fileManager.listQueryFiles(court);
      const htmlFiles = fileManager.listHtmlFiles(court);
      const documents = fileManager.listDocumentFiles(court);
      
      results.push({
        court,
        queryFiles: queryFiles.length,
        htmlFiles: htmlFiles.length,
        documents: documents.length
      });
      
      console.log(`Court ${court} processed successfully`);
      
    } catch (error) {
      console.error(`Error processing court ${court}:`, error);
      results.push({
        court,
        error: error.message
      });
    }
  }
  
  console.log('Batch processing results:', results);
}

// Example 8: Cost monitoring
async function costMonitoringExample() {
  console.log('\nExample 8: Cost monitoring...');
  
  const scraper = new PacerScraper();
  const fileManager = new FileManager('demo/pacer');
  
  // Run a small query to monitor costs
  const result = await scraper.runQueryScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    queryConfig: createDateRangeQuery({
      filedFrom: '06/29/2007',
      filedTo: '06/30/2007',
      caseStatus: 'closed'
    }),
    caseLimit: 1,
    overrideTime: true
  });
  
  console.log(`Query cost: ${result.totalCost}`);
  console.log(`Success: ${result.success}, Failure: ${result.failure}, Skipped: ${result.skipped}`);
  
  // Calculate total costs across all operations
  const documents = fileManager.listDocumentFiles('psc');
  const totalDocuments = documents.length;
  const estimatedCost = totalDocuments * 0.10; // Rough estimate: $0.10 per document
  
  console.log(`Total documents downloaded: ${totalDocuments}`);
  console.log(`Estimated total cost: $${estimatedCost.toFixed(2)}`);
}

// Run examples
if (require.main === module) {
  advancedUsageExample()
    .then(() => costMonitoringExample())
    .catch(console.error);
}
