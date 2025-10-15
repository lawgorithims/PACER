# PACER Client

A TypeScript client for interacting with the PACER (Public Access to Court Electronic Records) system. This library provides functionality to authenticate, search for cases, scrape docket information, and download court documents.

## Features

- **Authentication**: Secure login to PACER system with token management
- **Case Search**: Search for cases using various criteria (case number, court, date ranges, etc.)
- **Docket Scraping**: Extract docket entries and case information using Puppeteer
- **Document Download**: Download court documents (PDFs) with proper authentication
- **TypeScript Support**: Full TypeScript definitions and type safety

## Installation

```bash
npm install
```

## Setup

### 1. Configure PACER Credentials

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your PACER credentials:

```
PACER_USERNAME=your_actual_username
PACER_PASSWORD=your_actual_password
```

**Important**: Never commit your actual credentials to version control. The `.env` file is already in `.gitignore`.

## Dependencies

- **axios**: HTTP client for API requests
- **puppeteer**: Browser automation for web scraping
- **typescript**: TypeScript compiler
- **@types/node**: Node.js type definitions

## Project Structure

```
├── src/
│   ├── auth.ts              # PACER authentication
│   ├── case-search.ts       # Case search functionality
│   ├── docket-scraper.ts    # Docket data extraction
│   ├── document-downloader.ts # Document download functionality
│   ├── index.ts            # Main exports
│   └── types.ts            # TypeScript type definitions
├── downloadDoc.ts          # Example: Document download
├── getDocket.ts            # Example: Docket scraping
├── getToken.ts             # Example: Authentication
├── searchCase.ts           # Example: Case search
├── package.json
└── tsconfig.json
```

## Usage Examples

### 1. Authentication

```typescript
import { PacerAuth } from './src/index.js';

const auth = new PacerAuth('production'); // or 'qa' for testing

// Login to PACER
const response = await auth.authenticate({
  loginId: 'your_username',
  password: 'your_password',
  redactFlag: '1' // required for filers
});

// Get the authentication token
const token = auth.getToken();
console.log('Token:', token);

// Logout when done
await auth.logout();
```

### 2. Case Search

```typescript
import { PacerCaseSearch } from './src/index.js';

const caseSearch = new PacerCaseSearch('production');

// Search for cases
await caseSearch.searchAndSave(
  token,
  {
    caseNumberFull: '22-cv-00406',
    courtId: ['nmdc'] // New Mexico District Court
  },
  'case-results.json'
);
```

**Search Criteria Options:**
- `caseNumberFull`: Full case number
- `courtId`: Array of court IDs
- `caseTitle`: Case title
- `dateFiledFrom`/`dateFiledTo`: Date range
- `caseType`: Array of case types
- `natureOfSuit`: Nature of suit codes

### 3. Docket Scraping

```typescript
import { DocketScraper } from './src/index.js';

const scraper = new DocketScraper({
  username: 'your_username',
  password: 'your_password',
  headless: false // Set to true for headless mode
});

try {
  await scraper.init();
  
  // Scrape docket data from a case link
  await scraper.saveDocketData(
    'https://ecf.nmd.uscourts.gov/cgi-bin/DktRpt.pl?123456',
    'docket-data.json'
  );
} finally {
  await scraper.close();
}
```

### 4. Document Download

```typescript
import { DocumentDownloader } from './src/index.js';

const downloader = new DocumentDownloader({
  username: 'your_username',
  password: 'your_password',
  headless: false,
  downloadPath: './downloads'
});

try {
  await downloader.init();
  
  const downloadedFile = await downloader.downloadDocument(
    'https://ecf.nmd.uscourts.gov/doc1/121112427138',
    'document.pdf'
  );
  
  console.log(`Downloaded: ${downloadedFile}`);
} finally {
  await downloader.close();
}
```

### 5. Complete Workflow: Search → Scrape → Download

```typescript
import { PacerAuth, PacerCaseSearch, DocketScraper, DocumentDownloader } from './src/index.js';
import { readFileSync } from 'fs';

// Step 1: Authenticate
const auth = new PacerAuth('production');
await auth.authenticate({
  loginId: 'your_username',
  password: 'your_password',
  redactFlag: '1'
});
const token = auth.getToken();

// Step 2: Search for cases
const caseSearch = new PacerCaseSearch('production');
await caseSearch.searchAndSave(token, {
  caseNumberFull: '22-cv-00406',
  courtId: ['nmdc']
}, 'case-results.json');

// Step 3: Scrape docket data
const scraper = new DocketScraper({
  username: 'your_username',
  password: 'your_password',
  headless: false
});

await scraper.init();
const caseResults = JSON.parse(readFileSync('case-results.json', 'utf-8'));
const caseLink = caseResults.content[0].caseLink;
await scraper.saveDocketData(caseLink, 'docket-data.json');
await scraper.close();

// Step 4: Download a specific document
const docketData = JSON.parse(readFileSync('docket-data.json', 'utf-8'));
const firstDocument = docketData.entries.find(entry => entry.documentLink);

if (firstDocument) {
  const downloader = new DocumentDownloader({
    username: 'your_username',
    password: 'your_password',
    headless: false,
    downloadPath: './downloads'
  });
  
  await downloader.init();
  const downloadedFile = await downloader.downloadDocument(
    firstDocument.documentLink,
    `doc_${firstDocument.documentNumber}.pdf`
  );
  console.log(`Downloaded: ${downloadedFile}`);
  await downloader.close();
}
```

## Running the Examples

### 1. Get Authentication Token

```bash
npx tsx getToken.ts
```

This will authenticate with PACER and save the token to `token.txt`.

### 2. Search for Cases

```bash
# Search New Mexico case
npx tsx searchCase.ts 22-cv-00406 nmdc

# Search Minnesota case  
npx tsx searchCase.ts 25-cv-03951 mndc minnesota-case-results.json

# Show help
npx tsx searchCase.ts
```

This will search for cases and save results to the specified file (default: `case-results.json`).

### 3. Scrape Docket Data

```bash
# Scrape from default case-results.json
npx tsx getDocket.ts

# Scrape from specific file
npx tsx getDocket.ts minnesota-case-results.json minnesota-docket-data.json

# Show help
npx tsx getDocket.ts
```

This will scrape docket information from the first case in the specified file.

### 4. Download Documents

```bash
# Download document #3 from docket-data.json
npx tsx downloadDoc.ts docket-data.json 3

# Download document #4 from Minnesota docket
npx tsx downloadDoc.ts minnesota-docket-data.json 4 minnesota_doc_4.pdf

# Show help
npx tsx downloadDoc.ts
```

This will download a specific document by number from the docket data.

### 5. Complete Workflow Example

```bash
# Step 1: Authenticate
npx tsx getToken.ts

# Step 2: Search for a case
npx tsx searchCase.ts 25-cv-03951 mndc minnesota-case-results.json

# Step 3: Scrape docket data
npx tsx getDocket.ts minnesota-case-results.json minnesota-docket-data.json

# Step 4: Download specific documents
npx tsx downloadDoc.ts minnesota-docket-data.json 3 minnesota_doc_3.pdf
npx tsx downloadDoc.ts minnesota-docket-data.json 4 minnesota_doc_4.pdf
```

## Configuration

### Environment

- **Production**: `'production'` - Use for live PACER system
- **QA**: `'qa'` - Use for testing environment

### Court IDs

Common court IDs for case searches:
- `nmdc`: New Mexico District Court
- `cand`: California Northern District
- `nyed`: New York Eastern District
- `nynd`: New York Northern District

### Browser Options

- `headless: true` - Run browser in background (faster)
- `headless: false` - Show browser window (useful for debugging)

## API Reference

### PacerAuth

**Methods:**
- `authenticate(credentials)` - Login to PACER
- `getToken()` - Get stored authentication token
- `isAuthenticated()` - Check if logged in
- `logout()` - Logout and clear token

### PacerCaseSearch

**Methods:**
- `searchCases(token, criteria)` - Search for cases
- `searchAndSave(token, criteria, outputFile)` - Search and save to file

### DocketScraper

**Methods:**
- `init()` - Initialize browser
- `saveDocketData(caseLink, outputFile)` - Scrape and save docket data
- `close()` - Close browser

### DocumentDownloader

**Methods:**
- `init()` - Initialize browser with download settings
- `downloadDocument(documentUrl, filename)` - Download a document
- `close()` - Close browser

## Error Handling

The library includes comprehensive error handling for:
- Authentication failures
- Network timeouts
- Browser automation errors
- File system errors

## Security Notes

- **Never commit credentials** to version control
- Use environment variables for sensitive data
- The library handles PACER's redaction agreement automatically
- Browser sessions are properly cleaned up

## Troubleshooting

### Common Issues

1. **Authentication fails**: Verify credentials and check if MFA is required
2. **Browser crashes**: Try running with `headless: false` to see what's happening
3. **Download timeouts**: Increase timeout values for large documents
4. **Court access**: Ensure your PACER account has access to the specific court

### Debug Mode

Set `headless: false` in browser options to see the automation in action:

```typescript
const scraper = new DocketScraper({
  username: 'your_username',
  password: 'your_password',
  headless: false // Shows browser window
});
```

## License

MIT License - see package.json for details.

## Contributing

This is a TypeScript project. Make sure to:
1. Run `npm run build` to compile TypeScript
2. Use proper TypeScript types
3. Test with both headless and non-headless modes
4. Handle errors gracefully

## Support

For issues related to PACER access or court-specific problems, consult the official PACER documentation or contact the court directly.
