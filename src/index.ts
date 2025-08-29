// Main exports for PACER Scraper TypeScript API

export { PacerScraper } from './core/PacerScraper';
export { FileManager } from './utils/FileManager';

// Type exports
export type {
  PacerCredentials,
  QueryConfig,
  ScraperOptions,
  QueryScraperOptions,
  DocketScraperOptions,
  SummaryScraperOptions,
  MemberScraperOptions,
  DocumentScraperOptions,
  ScraperConfig,
  ScraperResult,
  CaseInfo,
  DocumentInfo,
  DocketEntry,
  ScraperError,
  ScraperProgress
} from './types';

// Convenience functions for common operations
export { 
  createPacerScraper,
  createFileManager,
  runCompleteWorkflow,
  createDateRangeQuery,
  createDocumentInputCsv,
  createDocketUpdateCsv,
  validateCredentials,
  getCourtFromUcid,
  getCaseNumberFromUcid,
  createUcid,
  formatCost,
  parseCost
} from './utils/helpers';
