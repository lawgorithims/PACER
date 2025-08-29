import { PacerScraper } from '../core/PacerScraper';
import { FileManager } from './FileManager';
import { QueryConfig, ScraperResult } from '../types';

/**
 * Create a PACER scraper instance with default settings
 */
export function createPacerScraper(
  pythonPath: string = 'python',
  scraperPath?: string
): PacerScraper {
  return new PacerScraper(pythonPath, scraperPath);
}

/**
 * Create a file manager instance
 */
export function createFileManager(basePath: string): FileManager {
  return new FileManager(basePath);
}

/**
 * Run a complete scraping workflow: query -> docket -> document
 */
export async function runCompleteWorkflow(options: {
  court: string;
  authPath: string;
  inPath: string;
  queryConfig: QueryConfig;
  caseLimit?: number;
  documentAllDocs?: boolean;
  overrideTime?: boolean;
}): Promise<{
  query: ScraperResult;
  docket: ScraperResult;
  document: ScraperResult;
}> {
  const scraper = createPacerScraper();
  
  console.log('Starting complete PACER scraping workflow...');
  
  // Step 1: Run query scraper
  console.log('Step 1: Running query scraper...');
  const queryResult = await scraper.runQueryScraper({
    court: options.court,
    authPath: options.authPath,
    inPath: options.inPath,
    queryConfig: options.queryConfig,
    caseLimit: options.caseLimit,
    overrideTime: options.overrideTime
  });
  
  // Step 2: Run docket scraper
  console.log('Step 2: Running docket scraper...');
  const fileManager = createFileManager(options.inPath);
  const queryFiles = fileManager.listQueryFiles(options.court);
  
  if (queryFiles.length === 0) {
    throw new Error('No query result files found');
  }
  
  const docketResult = await scraper.runDocketScraper({
    court: options.court,
    authPath: options.authPath,
    inPath: options.inPath,
    docketInput: queryFiles[0], // Use the first query file
    caseLimit: options.caseLimit,
    overrideTime: options.overrideTime
  });
  
  // Step 3: Run document scraper
  console.log('Step 3: Running document scraper...');
  const documentResult = await scraper.runDocumentScraper({
    court: options.court,
    authPath: options.authPath,
    inPath: options.inPath,
    documentInput: queryFiles[0], // Use the same query file
    documentAllDocs: options.documentAllDocs,
    caseLimit: options.caseLimit,
    overrideTime: options.overrideTime
  });
  
  console.log('Complete workflow finished successfully!');
  
  return {
    query: queryResult,
    docket: docketResult,
    document: documentResult
  };
}

/**
 * Create a query configuration for date range search
 */
export function createDateRangeQuery(options: {
  filedFrom: string; // MM/DD/YYYY
  filedTo: string; // MM/DD/YYYY
  caseStatus?: 'open' | 'closed' | 'both';
  caseType?: string;
  natureSuit?: string;
}): QueryConfig {
  return {
    filed_from: options.filedFrom,
    filed_to: options.filedTo,
    case_status: options.caseStatus || 'both',
    case_type: options.caseType,
    nature_suit: options.natureSuit
  };
}

/**
 * Create a document input CSV for specific documents
 */
export function createDocumentInputCsv(
  cases: Array<{ ucid: string; docNos: string[] }>,
  outputPath: string
): void {
  const csvContent = [
    'ucid,doc_no',
    ...cases.map(case_ => `${case_.ucid},"${case_.docNos.join(',')}"`)
  ].join('\n');
  
  const fs = require('fs');
  fs.writeFileSync(outputPath, csvContent);
}

/**
 * Create a docket update CSV
 */
export function createDocketUpdateCsv(
  cases: Array<{ ucid: string; latestDate?: string }>,
  outputPath: string
): void {
  const csvContent = [
    'ucid,latest_date',
    ...cases.map(case_ => `${case_.ucid}${case_.latestDate ? `,${case_.latestDate}` : ''}`)
  ].join('\n');
  
  const fs = require('fs');
  fs.writeFileSync(outputPath, csvContent);
}

/**
 * Validate PACER credentials
 */
export function validateCredentials(credentials: { user: string; pass: string }): boolean {
  return !!(credentials.user && credentials.pass && 
           credentials.user.trim() && credentials.pass.trim());
}

/**
 * Get court abbreviation from UCID
 */
export function getCourtFromUcid(ucid: string): string {
  const parts = ucid.split(';;');
  return parts[0] || '';
}

/**
 * Get case number from UCID
 */
export function getCaseNumberFromUcid(ucid: string): string {
  const parts = ucid.split(';;');
  return parts[1] || '';
}

/**
 * Create UCID from court and case number
 */
export function createUcid(court: string, caseNumber: string): string {
  return `${court};;${caseNumber}`;
}

/**
 * Format cost string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Parse cost string to number
 */
export function parseCost(costString: string): number {
  const match = costString.match(/\$([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}
