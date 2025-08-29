import {
  PacerScraper,
  FileManager,
  createDateRangeQuery,
  createDocumentInputCsv,
  createPacerScraper,
  createFileManager
} from '../src/index';
import * as path from 'path';

/**
 * Main demo workflow that replicates the PACER scraper tutorial
 * This demonstrates the complete workflow: Query -> Docket -> Document scraping
 */
async function runDemoWorkflow() {
  console.log('Starting PACER Scraper Demo Workflow');
  console.log('This demo replicates the tutorial workflow for Northern Illinois cases\n');

  // Initialize scraper and file manager instances
  // The scraper handles communication with the Python script
  // The file manager helps organize and access downloaded files
  const scraper = createPacerScraper();
  const fileManager = createFileManager('demo/pacer');

  // Configuration for the demo
  const authPath = 'auth.json';  // Path to PACER credentials
  const court = 'ilnd';          // Northern Illinois District Court
  const basePath = 'demo/pacer'; // Base directory for PACER data

  try {
    // STEP 1: QUERY SCRAPER
    // Search for cases filed in the first week of 2020
    // This is equivalent to the Python command:
    // python scrapers.py -m query -a auth.json --query-prefix "first_week_2020" -c ilnd demo/pacer/ilnd
    console.log('Step 1: Running Query Scraper for first week of 2020...');
    console.log('This will search for cases filed between 01/01/2020 and 01/07/2020\n');
    
    // Create a query configuration for date range search
    // This defines the search parameters for PACER
    const queryConfig = createDateRangeQuery({
      filedFrom: '01/01/2020',  // Start date (MM/DD/YYYY)
      filedTo: '01/07/2020',    // End date (MM/DD/YYYY)
      caseStatus: 'closed'       // Only closed cases
    });

    // Execute the query scraper
    // This will:
    // 1. Connect to PACER using credentials in auth.json
    // 2. Run the search query with the specified parameters
    // 3. Download the query results to demo/pacer/ilnd/queries/first_week_2020.html
    const queryResult = await scraper.runQueryScraper({
      court: court,
      authPath: authPath,
      inPath: path.join(basePath, court),
      queryConfig: queryConfig,
      queryPrefix: 'first_week_2020',  // Prefix for the output file
      caseLimit: 5  // Limit to 5 cases for demo purposes
    });

    console.log('Query Scraper completed successfully');
    console.log(`Results: Success=${queryResult.success}, Failure=${queryResult.failure}, Skipped=${queryResult.skipped}`);
    console.log(`Total Cost: ${queryResult.totalCost}\n`);

    // STEP 2: DOCKET SCRAPER
    // Download dockets for cases found in the query results
    // This is equivalent to the Python command:
    // python scrapers.py -m docket -a auth.json --document-input demo/pacer/ilnd/queries/first_week_2020.html -c ilnd demo/pacer/ilnd
    console.log('Step 2: Running Docket Scraper...');
    console.log('This will download docket information for cases found in the query\n');
    
    // Path to the query results file generated in Step 1
    const queryFile = path.join(basePath, court, 'queries', 'first_week_2020.html');
    
    // Execute the docket scraper
    // This will:
    // 1. Read the query results file
    // 2. Extract case information from each case in the results
    // 3. Download docket entries for each case
    // 4. Save docket HTML files to demo/pacer/ilnd/html/20/ (for 2020 cases)
    const docketResult = await scraper.runDocketScraper({
      court: court,
      authPath: authPath,
      inPath: path.join(basePath, court),
      docketInput: queryFile,        // Use the query results file as input
      docketMemList: 'avoid',        // Avoid member list to save costs
      caseLimit: 3                   // Limit to 3 cases for demo
    });

    console.log('Docket Scraper completed successfully');
    console.log(`Results: Success=${docketResult.success}, Failure=${docketResult.failure}, Skipped=${docketResult.skipped}`);
    console.log(`Total Cost: ${docketResult.totalCost}\n`);

    // STEP 3: DOCUMENT SCRAPER
    // Download specific documents from the cases
    // This is equivalent to the Python command:
    // python scraper.py -m document -a auth.json -c ilnd --document-input demo/subset.csv demo/pacer/ilnd
    console.log('Step 3: Running Document Scraper...');
    console.log('This will download specific documents from the cases\n');
    
    // Create a subset CSV file specifying which documents to download
    // This defines which specific documents we want from which cases
    const subsetData = [
      { ucid: 'ilnd;;1:20-cv-00001', docNos: ['2'] },      // Document 2 from case 1
      { ucid: 'ilnd;;1:20-cv-00002', docNos: ['4', '5'] }  // Documents 4 and 5 from case 2
    ];
    
    // Create the CSV file that the document scraper will read
    // The CSV format is: ucid,doc_no
    // Example: ilnd;;1:20-cv-00001,"2"
    createDocumentInputCsv(subsetData, 'demo/subset.csv');
    const documentInputPath = 'demo/subset.csv';
    
    // Execute the document scraper
    // This will:
    // 1. Read the subset CSV file
    // 2. For each case/document combination:
    //    - Check if the docket exists (from Step 2)
    //    - Download the specified document
    //    - Save PDF files to demo/pacer/ilnd/docs/20/
    const documentResult = await scraper.runDocumentScraper({
      court: court,
      authPath: authPath,
      inPath: path.join(basePath, court),
      documentInput: documentInputPath,
      documentSkipSeen: true,        // Skip already downloaded documents
      caseLimit: 2                   // Limit to 2 cases for demo
    });

    console.log('Document Scraper completed successfully');
    console.log(`Results: Success=${documentResult.success}, Failure=${documentResult.failure}, Skipped=${documentResult.skipped}`);
    console.log(`Total Cost: ${documentResult.totalCost}\n`);

    // STEP 4: FILE MANAGEMENT
    // Check what files were downloaded and organize the results
    console.log('Step 4: Checking downloaded files...');
    console.log('This shows what files were created during the scraping process\n');
    
    try {
      // List all files in different categories
      const queryFiles = fileManager.listQueryFiles(court);           // Query result files
      const htmlFiles = fileManager.listHtmlFiles(court, '20');       // Docket HTML files (2020 cases)
      const documents = fileManager.listDocumentFiles(court, '20');   // Document PDF files (2020 cases)

      console.log(`Query files found: ${queryFiles.length}`);
      console.log(`HTML files found: ${htmlFiles.length}`);
      console.log(`Document files found: ${documents.length}`);

      // Show sample files if any exist
      if (queryFiles.length > 0) {
        console.log(`Sample query file: ${queryFiles[0]}`);
      }
      if (htmlFiles.length > 0) {
        console.log(`Sample HTML file: ${htmlFiles[0]}`);
      }
      if (documents.length > 0) {
        console.log(`Sample document: ${documents[0]}`);
      }
    } catch (error) {
      console.log('File listing skipped (files may not exist yet)');
      console.log('This is normal if the scraping process is still running or if no files were downloaded');
    }

    // SUMMARY
    console.log('\nDemo workflow completed successfully!');
    console.log('\nCost Summary:');
    console.log(`Query Cost: ${queryResult.totalCost}`);
    console.log(`Docket Cost: ${docketResult.totalCost}`);
    console.log(`Document Cost: ${documentResult.totalCost}`);
    
    // Calculate total cost
    const totalCost = parseFloat(queryResult.totalCost.replace('$', '')) +
                     parseFloat(docketResult.totalCost.replace('$', '')) +
                     parseFloat(documentResult.totalCost.replace('$', ''));
    console.log(`Total Cost: $${totalCost.toFixed(2)}`);

  } catch (error) {
    console.error('Demo workflow failed:', error);
    
    // Provide helpful error messages based on error type
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'SCRAPER_FAILED') {
        console.error('Scraper process failed. Check the log file for details.');
        const errorObj = error as any;
        if (errorObj.details?.logPath) {
          console.error(`Log file: ${errorObj.details.logPath}`);
        }
      } else if (error.code === 'PROCESS_ERROR') {
        console.error('Failed to start scraper process. Check Python installation and scraper path.');
      }
    }
  }
}

/**
 * Alternative workflow using manual case list
 * This demonstrates how to use a CSV file with specific case numbers
 * instead of running a query first
 */
async function runManualWorkflow() {
  console.log('\nAlternative: Manual Workflow with CSV Input');
  console.log('This demonstrates using a manual list of cases instead of a query\n');

  const scraper = createPacerScraper();
  const authPath = 'auth.json';
  const court = 'ilnd';
  const basePath = 'demo/pacer';

  try {
    // Create a manual case list CSV
    // This is useful when you already know which cases you want to process
    const manualCases = [
      { ucid: 'ilnd;;1:20-cv-00001', docNos: [] },  // All documents from case 1
      { ucid: 'ilnd;;1:20-cv-00002', docNos: [] },  // All documents from case 2
      { ucid: 'ilnd;;1:20-cv-00003', docNos: [] }   // All documents from case 3
    ];

    // Create the CSV file for manual case input
    createDocumentInputCsv(manualCases, 'demo/manual_cases.csv');
    const manualInputPath = 'demo/manual_cases.csv';

    // Run docket scraper with manual input
    // This skips the query step and goes directly to downloading dockets
    console.log('Running Docket Scraper with manual case list...');
    console.log('This will download dockets for the specified cases\n');
    
    const docketResult = await scraper.runDocketScraper({
      court: court,
      authPath: authPath,
      inPath: path.join(basePath, court),
      docketInput: manualInputPath,  // Use the manual CSV file
      caseLimit: 2                   // Limit to 2 cases for demo
    });

    console.log('Manual docket scraper completed successfully');
    console.log(`Results: Success=${docketResult.success}, Failure=${docketResult.failure}, Skipped=${docketResult.skipped}`);

  } catch (error) {
    console.error('Manual workflow failed:', error);
  }
}

// Run the demo when this file is executed directly
if (require.main === module) {
  runDemoWorkflow()
    .then(() => runManualWorkflow())
    .catch(console.error);
}

export { runDemoWorkflow, runManualWorkflow };
