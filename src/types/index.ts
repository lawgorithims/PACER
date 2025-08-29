// Core types for PACER scraper API

export interface PacerCredentials {
  user: string;
  pass: string;
}

export interface QueryConfig {
  case_status?: 'open' | 'closed' | 'both';
  filed_from?: string; // MM/DD/YYYY format
  filed_to?: string; // MM/DD/YYYY format
  nature_suit?: string;
  case_type?: string;
  [key: string]: any;
}

export interface ScraperOptions {
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

export interface QueryScraperOptions extends ScraperOptions {
  mode: 'query';
  queryConf?: string | QueryConfig;
  queryPrefix?: string;
}

export interface DocketScraperOptions extends ScraperOptions {
  mode: 'docket';
  docketInput: string;
  docketMemList?: 'always' | 'avoid' | 'never';
  docketExcludeParties?: boolean;
  docketExclusions?: string;
  docketUpdate?: boolean;
}

export interface SummaryScraperOptions extends ScraperOptions {
  mode: 'summary';
  summaryInput: string;
}

export interface MemberScraperOptions extends ScraperOptions {
  mode: 'member';
  memberInput: string;
}

export interface DocumentScraperOptions extends ScraperOptions {
  mode: 'document';
  documentInput: string;
  documentAllDocs?: boolean;
  documentAtt?: boolean;
  documentSkipSeen?: boolean;
  documentLimit?: number;
}

export type ScraperConfig = 
  | QueryScraperOptions 
  | DocketScraperOptions 
  | SummaryScraperOptions 
  | MemberScraperOptions 
  | DocumentScraperOptions;

export interface ScraperResult {
  success: number;
  failure: number;
  skipped: number;
  totalCost: string;
  logPath?: string;
}

export interface CaseInfo {
  ucid: string;
  caseNumber: string;
  court: string;
  filingDate?: string;
  caseStatus?: string;
  natureOfSuit?: string;
}

export interface DocumentInfo {
  ucid: string;
  docNo: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadDate: string;
}

export interface DocketEntry {
  entryNumber: number;
  filingDate: string;
  description: string;
  documentNumber?: string;
  attachments?: string[];
}

export interface ScraperError {
  code: string;
  message: string;
  details?: any;
}

export interface ScraperProgress {
  current: number;
  total: number;
  percentage: number;
  currentCase?: string;
  status: 'running' | 'completed' | 'error' | 'paused';
}
