# PACER Scraper TypeScript API Documentation

## Overview

The PACER Scraper TypeScript API provides a modern, type-safe interface to the PACER scraper functionality. This API wraps the Python scraper and provides convenient methods for common operations.

## Installation

```bash
npm install pacer-scraper-api
```

## Core Classes

### PacerScraper

The main class for running PACER scraper operations.

#### Constructor

```typescript
constructor(pythonPath?: string, scraperPath?: string)
```

- `pythonPath`: Path to Python executable (default: 'python')
- `scraperPath`: Path to the Python scraper script (optional)

#### Methods

##### runQueryScraper

Runs the query scraper to search for cases.

```typescript
async runQueryScraper(options: QueryScraperOptions): Promise<ScraperResult>
```

**Options:**
- `court`: Court abbreviation (e.g., 'psc', 'ilnd')
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `queryConfig`: Query configuration object or path to config file
- `queryPrefix`: Prefix for output query filenames
- `caseLimit`: Maximum number of cases to process
- `overrideTime`: Override time restrictions

**Example:**
```typescript
const result = await scraper.runQueryScraper({
  court: 'psc',
  authPath: 'auth.json',
  inPath: 'demo/pacer/psc',
  queryConfig: {
    filed_from: '06/29/2007',
    filed_to: '07/01/2007',
    case_status: 'closed'
  },
  caseLimit: 5,
  overrideTime: true
});
```

##### runDocketScraper

Runs the docket scraper to download case dockets.

```typescript
async runDocketScraper(options: DocketScraperOptions): Promise<ScraperResult>
```

**Options:**
- `court`: Court abbreviation
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `docketInput`: Path to query HTML file, directory, or CSV with UCIDs
- `docketMemList`: How to handle member lists ('always', 'avoid', 'never')
- `docketExcludeParties`: Exclude parties from docket reports
- `docketUpdate`: Check for new docket lines in existing cases
- `caseLimit`: Maximum number of cases to process
- `overrideTime`: Override time restrictions

**Example:**
```typescript
const result = await scraper.runDocketScraper({
  court: 'psc',
  authPath: 'auth.json',
  inPath: 'demo/pacer/psc',
  docketInput: 'demo/pacer/psc/queries',
  docketMemList: 'avoid',
  docketExcludeParties: true,
  caseLimit: 3,
  overrideTime: true
});
```

##### runDocumentScraper

Runs the document scraper to download case documents.

```typescript
async runDocumentScraper(options: DocumentScraperOptions): Promise<ScraperResult>
```

**Options:**
- `court`: Court abbreviation
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `documentInput`: Path to CSV file with UCIDs and document numbers
- `documentAllDocs`: Download all documents for each case
- `documentAtt`: Include document attachments
- `documentSkipSeen`: Skip cases with previously downloaded documents
- `documentLimit`: Maximum documents per case
- `caseLimit`: Maximum number of cases to process
- `overrideTime`: Override time restrictions

**Example:**
```typescript
const result = await scraper.runDocumentScraper({
  court: 'psc',
  authPath: 'auth.json',
  inPath: 'demo/pacer/psc',
  documentInput: 'document_input.csv',
  documentAllDocs: false,
  documentAtt: true,
  documentSkipSeen: true,
  caseLimit: 2,
  overrideTime: true
});
```

##### runSummaryScraper

Runs the summary scraper to download case summaries.

```typescript
async runSummaryScraper(options: SummaryScraperOptions): Promise<ScraperResult>
```

**Options:**
- `court`: Court abbreviation
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `summaryInput`: Path to query HTML file, directory, or CSV with UCIDs
- `caseLimit`: Maximum number of cases to process
- `overrideTime`: Override time restrictions

##### runMemberScraper

Runs the member scraper to download member case pages.

```typescript
async runMemberScraper(options: MemberScraperOptions): Promise<ScraperResult>
```

**Options:**
- `court`: Court abbreviation
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `memberInput`: Path to CSV file with UCIDs
- `caseLimit`: Maximum number of cases to process
- `overrideTime`: Override time restrictions

##### stopScraper

Stops the current scraper process.

```typescript
stopScraper(): void
```

### FileManager

Utility class for managing PACER files and directories.

#### Constructor

```typescript
constructor(basePath: string)
```

- `basePath`: Base path to PACER data directory

#### Methods

##### List Files

```typescript
listQueryFiles(court: string): string[]
listHtmlFiles(court: string, year?: string): string[]
listJsonFiles(court: string, year?: string): string[]
listDocumentFiles(court: string, year?: string): DocumentInfo[]
```

**Examples:**
```typescript
const fileManager = new FileManager('demo/pacer');

// List all query files
const queryFiles = fileManager.listQueryFiles('psc');

// List HTML files for specific year
const htmlFiles = fileManager.listHtmlFiles('psc', '07');

// List all documents
const documents = fileManager.listDocumentFiles('psc');
```

##### Get Case Information

```typescript
getCaseInfo(jsonFilePath: string): CaseInfo | null
getDocketEntries(jsonFilePath: string): DocketEntry[]
```

**Example:**
```typescript
const jsonFiles = fileManager.listJsonFiles('psc', '07');
if (jsonFiles.length > 0) {
  const caseInfo = fileManager.getCaseInfo(jsonFiles[0]);
  const docketEntries = fileManager.getDocketEntries(jsonFiles[0]);
  
  console.log('Case info:', caseInfo);
  console.log('Docket entries:', docketEntries);
}
```

##### Create Reports

```typescript
createCaseCsv(court: string, outputPath: string, year?: string): void
createDocumentCsv(court: string, outputPath: string, year?: string): void
```

**Example:**
```typescript
// Create CSV reports
fileManager.createCaseCsv('psc', 'cases_report.csv', '07');
fileManager.createDocumentCsv('psc', 'documents_report.csv', '07');
```

##### Check Existence

```typescript
caseExists(court: string, ucid: string): boolean
documentsExist(court: string, ucid: string): boolean
```

**Example:**
```typescript
const testUcid = 'psc;;1:07-cv-00431';
const caseExists = fileManager.caseExists('psc', testUcid);
const documentsExist = fileManager.documentsExist('psc', testUcid);
```

## Helper Functions

### Scraper Creation

```typescript
createPacerScraper(pythonPath?: string, scraperPath?: string): PacerScraper
createFileManager(basePath: string): FileManager
```

### Complete Workflow

```typescript
runCompleteWorkflow(options: WorkflowOptions): Promise<WorkflowResult>
```

**Options:**
- `court`: Court abbreviation
- `authPath`: Path to authentication JSON file
- `inPath`: Path to court directory
- `queryConfig`: Query configuration
- `caseLimit`: Maximum number of cases to process
- `documentAllDocs`: Download all documents
- `overrideTime`: Override time restrictions

**Example:**
```typescript
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
```

### Query Configuration

```typescript
createDateRangeQuery(options: DateRangeOptions): QueryConfig
```

**Options:**
- `filedFrom`: Start date (MM/DD/YYYY)
- `filedTo`: End date (MM/DD/YYYY)
- `caseStatus`: Case status ('open', 'closed', 'both')
- `caseType`: Case type
- `natureSuit`: Nature of suit

**Example:**
```typescript
const queryConfig = createDateRangeQuery({
  filedFrom: '06/29/2007',
  filedTo: '07/01/2007',
  caseStatus: 'closed',
  caseType: 'cv'
});
```

### CSV Creation

```typescript
createDocumentInputCsv(cases: DocumentCase[], outputPath: string): void
createDocketUpdateCsv(cases: UpdateCase[], outputPath: string): void
```

**Examples:**
```typescript
// Create document input CSV
const specificDocuments = [
  { ucid: 'psc;;1:07-cv-00431', docNos: ['2', '3:5', '6_1'] },
  { ucid: 'psc;;1:07-cv-00432', docNos: ['1', '4_1:3'] }
];
createDocumentInputCsv(specificDocuments, 'specific_documents.csv');

// Create docket update CSV
const updateCases = [
  { ucid: 'psc;;1:07-cv-00431', latestDate: '07/15/2007' },
  { ucid: 'psc;;1:07-cv-00432' }
];
createDocketUpdateCsv(updateCases, 'docket_update.csv');
```

### Utility Functions

```typescript
validateCredentials(credentials: PacerCredentials): boolean
getCourtFromUcid(ucid: string): string
getCaseNumberFromUcid(ucid: string): string
createUcid(court: string, caseNumber: string): string
formatCost(cost: number): string
parseCost(costString: string): number
```

**Examples:**
```typescript
// Validate credentials
const isValid = validateCredentials({ user: 'test', pass: 'test' });

// Parse UCID
const ucid = 'psc;;1:07-cv-00431';
const court = getCourtFromUcid(ucid); // 'psc'
const caseNumber = getCaseNumberFromUcid(ucid); // '1:07-cv-00431'

// Create UCID
const newUcid = createUcid('psc', '1:07-cv-00431');

// Format costs
const cost = formatCost(12.50); // '$12.50'
const amount = parseCost('$12.50'); // 12.5
```

## Types

### Core Types

```typescript
interface PacerCredentials {
  user: string;
  pass: string;
}

interface QueryConfig {
  case_status?: 'open' | 'closed' | 'both';
  filed_from?: string; // MM/DD/YYYY format
  filed_to?: string; // MM/DD/YYYY format
  nature_suit?: string;
  case_type?: string;
  [key: string]: any;
}

interface ScraperResult {
  success: number;
  failure: number;
  skipped: number;
  totalCost: string;
  logPath?: string;
}
```

### Data Types

```typescript
interface CaseInfo {
  ucid: string;
  caseNumber: string;
  court: string;
  filingDate?: string;
  caseStatus?: string;
  natureOfSuit?: string;
}

interface DocumentInfo {
  ucid: string;
  docNo: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadDate: string;
}

interface DocketEntry {
  entryNumber: number;
  filingDate: string;
  description: string;
  documentNumber?: string;
  attachments?: string[];
}
```

### Scraper Options

```typescript
interface ScraperOptions {
  mode: 'query' | 'docket' | 'summary' | 'member' | 'document';
  court: string;
  authPath: string;
  inPath: string;
  nWorkers?: number;
  caseType?: string;
  runtimeStart?: number;
  runtimeEnd?: number;
  overrideTime?: boolean;
  caseLimit?: number | 'false';
  costLimit?: number;
  headless?: boolean;
  verbose?: boolean;
  slabels?: string;
}

interface QueryScraperOptions extends ScraperOptions {
  mode: 'query';
  queryConf?: string | QueryConfig;
  queryPrefix?: string;
}

interface DocketScraperOptions extends ScraperOptions {
  mode: 'docket';
  docketInput: string;
  docketMemList?: 'always' | 'avoid' | 'never';
  docketExcludeParties?: boolean;
  docketExclusions?: string;
  docketUpdate?: boolean;
}

interface DocumentScraperOptions extends ScraperOptions {
  mode: 'document';
  documentInput: string;
  documentAllDocs?: boolean;
  documentAtt?: boolean;
  documentSkipSeen?: boolean;
  documentLimit?: number;
}
```

## Error Handling

The API uses structured error objects:

```typescript
interface ScraperError {
  code: string;
  message: string;
  details?: any;
}
```

**Common Error Codes:**
- `SCRAPER_FAILED`: Scraper process exited with non-zero code
- `PROCESS_ERROR`: Failed to start scraper process
- `VALIDATION_ERROR`: Invalid input parameters
- `FILE_NOT_FOUND`: Required file not found

**Example:**
```typescript
try {
  const result = await scraper.runQueryScraper(options);
  console.log('Success:', result);
} catch (error) {
  if (error.code === 'SCRAPER_FAILED') {
    console.error('Scraper failed:', error.message);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Always use case limits** to prevent accidental overspending
2. **Use `overrideTime` carefully** - the time restrictions exist for a reason
3. **Monitor costs** using the `totalCost` field in results
4. **Handle errors gracefully** with try-catch blocks
5. **Use the FileManager** to explore and manage downloaded data
6. **Create CSV reports** for data analysis and sharing
7. **Use specific document downloads** instead of downloading all documents when possible

## Examples

See the `examples/` directory for complete working examples:

- `examples/basic-usage.ts`: Basic usage patterns
- `examples/advanced-usage.ts`: Advanced scenarios and optimizations

## Troubleshooting

### Common Issues

1. **Python not found**: Ensure Python is installed and in PATH
2. **Authentication failed**: Check your PACER credentials in auth.json
3. **No results**: Verify query parameters and court abbreviation
4. **High costs**: Use case limits and specific document downloads
5. **Time restrictions**: Use `overrideTime` flag (with caution)

### Debug Mode

Enable verbose logging:

```typescript
const result = await scraper.runQueryScraper({
  ...options,
  verbose: true
});
```

### Log Files

Check log files for detailed error information:

```typescript
if (result.logPath) {
  console.log('Log file:', result.logPath);
}
```
