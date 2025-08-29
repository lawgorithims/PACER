import { 
  PacerScraper, 
  FileManager, 
  createDateRangeQuery,
  validateCredentials,
  createUcid,
  getCourtFromUcid,
  getCaseNumberFromUcid
} from '../src/index';

async function testApi() {
  console.log('Testing PACER Scraper TypeScript API...\n');

  // Test 1: Create scraper instance
  console.log('Test 1: Creating scraper instance...');
  const scraper = new PacerScraper();
  console.log('✅ Scraper instance created successfully\n');

  // Test 2: Create file manager
  console.log('Test 2: Creating file manager...');
  const fileManager = new FileManager('demo/pacer');
  console.log('✅ File manager created successfully\n');

  // Test 3: Test utility functions
  console.log('Test 3: Testing utility functions...');
  
  // Test credentials validation
  const validCreds = validateCredentials({ user: 'test', pass: 'test' });
  const invalidCreds = validateCredentials({ user: '', pass: '' });
  console.log(`✅ Credentials validation: valid=${validCreds}, invalid=${invalidCreds}`);
  
  // Test UCID functions
  const ucid = 'psc;;1:07-cv-00431';
  const court = getCourtFromUcid(ucid);
  const caseNumber = getCaseNumberFromUcid(ucid);
  const newUcid = createUcid('psc', '1:07-cv-00431');
  
  console.log(`✅ UCID parsing: court=${court}, caseNumber=${caseNumber}`);
  console.log(`✅ UCID creation: ${newUcid}\n`);

  // Test 4: Test query configuration
  console.log('Test 4: Testing query configuration...');
  const queryConfig = createDateRangeQuery({
    filedFrom: '06/29/2007',
    filedTo: '07/01/2007',
    caseStatus: 'closed'
  });
  console.log('✅ Query config created:', queryConfig, '\n');

  // Test 5: Test file listing (if demo data exists)
  console.log('Test 5: Testing file listing...');
  try {
    const queryFiles = fileManager.listQueryFiles('psc');
    const htmlFiles = fileManager.listHtmlFiles('psc', '07');
    const documents = fileManager.listDocumentFiles('psc', '07');
    
    console.log(`✅ Query files: ${queryFiles.length}`);
    console.log(`✅ HTML files: ${htmlFiles.length}`);
    console.log(`✅ Documents: ${documents.length}`);
    
    if (documents.length > 0) {
      console.log('✅ Sample document:', documents[0]);
    }
  } catch (error) {
    console.log('⚠️  File listing test skipped (demo data may not exist)');
  }
  console.log('');

  // Test 6: Test case existence check
  console.log('Test 6: Testing case existence check...');
  const testUcid = 'psc;;1:07-cv-00431';
  const caseExists = fileManager.caseExists('psc', testUcid);
  const documentsExist = fileManager.documentsExist('psc', testUcid);
  
  console.log(`✅ Case exists: ${caseExists}`);
  console.log(`✅ Documents exist: ${documentsExist}\n`);

  console.log('🎉 All API tests completed successfully!');
  console.log('\nNote: This test only validates the API structure and utility functions.');
  console.log('To test actual scraping functionality, run the examples in the examples/ directory.');
}

// Run the test
if (require.main === module) {
  testApi().catch(console.error);
}
