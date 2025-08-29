import { 
  PacerScraper, 
  FileManager, 
  createDateRangeQuery, 
  runCompleteWorkflow 
} from '../src/index';

async function basicUsageExample() {
  // Create scraper instance
  const scraper = new PacerScraper();
  
  // Example 1: Run a simple query
  console.log('Example 1: Running a query scraper...');
  const queryResult = await scraper.runQueryScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    queryConfig: createDateRangeQuery({
      filedFrom: '06/29/2007',
      filedTo: '07/01/2007',
      caseStatus: 'closed'
    }),
    caseLimit: 5,
    overrideTime: true
  });
  
  console.log('Query result:', queryResult);
  
  // Example 2: Run docket scraper
  console.log('\nExample 2: Running docket scraper...');
  const docketResult = await scraper.runDocketScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    docketInput: 'demo/pacer/psc/queries',
    caseLimit: 3,
    overrideTime: true
  });
  
  console.log('Docket result:', docketResult);
  
  // Example 3: Run document scraper
  console.log('\nExample 3: Running document scraper...');
  const documentResult = await scraper.runDocumentScraper({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    documentInput: 'demo/document_input.csv',
    caseLimit: 1,
    overrideTime: true
  });
  
  console.log('Document result:', documentResult);
  
  // Example 4: Use file manager to explore downloaded data
  console.log('\nExample 4: Exploring downloaded data...');
  const fileManager = new FileManager('demo/pacer');
  
  const queryFiles = fileManager.listQueryFiles('psc');
  console.log('Query files:', queryFiles);
  
  const htmlFiles = fileManager.listHtmlFiles('psc', '07');
  console.log('HTML files:', htmlFiles);
  
  const documents = fileManager.listDocumentFiles('psc', '07');
  console.log('Documents:', documents);
  
  // Example 5: Create CSV reports
  console.log('\nExample 5: Creating CSV reports...');
  fileManager.createCaseCsv('psc', 'cases_report.csv', '07');
  fileManager.createDocumentCsv('psc', 'documents_report.csv', '07');
  
  console.log('CSV reports created successfully!');
}

async function completeWorkflowExample() {
  console.log('Running complete workflow example...');
  
  const results = await runCompleteWorkflow({
    court: 'psc',
    authPath: 'auth.json',
    inPath: 'demo/pacer/psc',
    queryConfig: createDateRangeQuery({
      filedFrom: '06/29/2007',
      filedTo: '07/01/2007',
      caseStatus: 'closed'
    }),
    caseLimit: 3,
    documentAllDocs: false,
    overrideTime: true
  });
  
  console.log('Complete workflow results:', results);
}

// Run examples
if (require.main === module) {
  basicUsageExample()
    .then(() => completeWorkflowExample())
    .catch(console.error);
}
