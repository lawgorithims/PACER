import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ScraperConfig, 
  ScraperResult, 
  ScraperError, 
  ScraperProgress,
  QueryConfig 
} from '../types';

export class PacerScraper {
  private pythonPath: string;
  private scraperPath: string;
  private currentProcess?: ChildProcess;

  constructor(pythonPath: string = 'python', scraperPath?: string) {
    this.pythonPath = pythonPath;
    this.scraperPath = scraperPath || path.join(process.cwd(), 'src/pacer_tools/code/downloader/scrapers.py');
  }

  /**
   * Run a PACER scraper operation
   */
  async runScraper(config: ScraperConfig): Promise<ScraperResult> {
    return new Promise((resolve, reject) => {
      const args = this.buildScraperArgs(config);
      
      console.log(`Running PACER scraper with mode: ${config.mode}`);
      console.log(`Command: ${this.pythonPath} ${this.scraperPath} ${args.join(' ')}`);

      this.currentProcess = spawn(this.pythonPath, [this.scraperPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        console.log(data.toString());
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.error(data.toString());
      });

      this.currentProcess.on('close', (code: number | null) => {
        if (code === 0) {
          const result = this.parseScraperOutput(stdout);
          resolve(result);
        } else {
          const error: ScraperError = {
            code: 'SCRAPER_FAILED',
            message: `Scraper process exited with code ${code}`,
            details: { stdout, stderr, exitCode: code }
          };
          reject(error);
        }
      });

      this.currentProcess.on('error', (error: Error) => {
        reject({
          code: 'PROCESS_ERROR',
          message: 'Failed to start scraper process',
          details: error
        });
      });
    });
  }

  /**
   * Run query scraper to search for cases
   */
  async runQueryScraper(options: {
    court: string;
    authPath: string;
    inPath: string;
    queryConfig?: QueryConfig | string;
    queryPrefix?: string;
    caseLimit?: number;
    overrideTime?: boolean;
  }): Promise<ScraperResult> {
    const config: ScraperConfig = {
      mode: 'query',
      court: options.court,
      authPath: options.authPath,
      inPath: options.inPath,
      queryConf: options.queryConfig,
      queryPrefix: options.queryPrefix,
      caseLimit: options.caseLimit,
      overrideTime: options.overrideTime
    };

    return this.runScraper(config);
  }

  /**
   * Run docket scraper to download case dockets
   */
  async runDocketScraper(options: {
    court: string;
    authPath: string;
    inPath: string;
    docketInput: string;
    docketMemList?: 'always' | 'avoid' | 'never';
    docketExcludeParties?: boolean;
    docketUpdate?: boolean;
    caseLimit?: number;
    overrideTime?: boolean;
  }): Promise<ScraperResult> {
    const config: ScraperConfig = {
      mode: 'docket',
      court: options.court,
      authPath: options.authPath,
      inPath: options.inPath,
      docketInput: options.docketInput,
      docketMemList: options.docketMemList,
      docketExcludeParties: options.docketExcludeParties,
      docketUpdate: options.docketUpdate,
      caseLimit: options.caseLimit,
      overrideTime: options.overrideTime
    };

    return this.runScraper(config);
  }

  /**
   * Run document scraper to download case documents
   */
  async runDocumentScraper(options: {
    court: string;
    authPath: string;
    inPath: string;
    documentInput: string;
    documentAllDocs?: boolean;
    documentAtt?: boolean;
    documentSkipSeen?: boolean;
    documentLimit?: number;
    caseLimit?: number;
    overrideTime?: boolean;
  }): Promise<ScraperResult> {
    const config: ScraperConfig = {
      mode: 'document',
      court: options.court,
      authPath: options.authPath,
      inPath: options.inPath,
      documentInput: options.documentInput,
      documentAllDocs: options.documentAllDocs,
      documentAtt: options.documentAtt,
      documentSkipSeen: options.documentSkipSeen,
      documentLimit: options.documentLimit,
      caseLimit: options.caseLimit,
      overrideTime: options.overrideTime
    };

    return this.runScraper(config);
  }

  /**
   * Run summary scraper to download case summaries
   */
  async runSummaryScraper(options: {
    court: string;
    authPath: string;
    inPath: string;
    summaryInput: string;
    caseLimit?: number;
    overrideTime?: boolean;
  }): Promise<ScraperResult> {
    const config: ScraperConfig = {
      mode: 'summary',
      court: options.court,
      authPath: options.authPath,
      inPath: options.inPath,
      summaryInput: options.summaryInput,
      caseLimit: options.caseLimit,
      overrideTime: options.overrideTime
    };

    return this.runScraper(config);
  }

  /**
   * Run member scraper to download member case pages
   */
  async runMemberScraper(options: {
    court: string;
    authPath: string;
    inPath: string;
    memberInput: string;
    caseLimit?: number;
    overrideTime?: boolean;
  }): Promise<ScraperResult> {
    const config: ScraperConfig = {
      mode: 'member',
      court: options.court,
      authPath: options.authPath,
      inPath: options.inPath,
      memberInput: options.memberInput,
      caseLimit: options.caseLimit,
      overrideTime: options.overrideTime
    };

    return this.runScraper(config);
  }

  /**
   * Stop the current scraper process
   */
  stopScraper(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = undefined;
    }
  }

  /**
   * Build command line arguments for the scraper
   */
  private buildScraperArgs(config: ScraperConfig): string[] {
    const args: string[] = [];

    // Mode
    args.push('-m', config.mode);

    // Court
    args.push('-c', config.court);

    // Auth path
    args.push('-a', config.authPath);

    // Input path (last argument)
    args.push(config.inPath);

    // Optional arguments
    if (config.nWorkers) args.push('-nw', config.nWorkers.toString());
    if (config.caseType) args.push('-ct', config.caseType);
    if (config.runtimeStart) args.push('-rts', config.runtimeStart.toString());
    if (config.runtimeEnd) args.push('-rte', config.runtimeEnd.toString());
    if (config.overrideTime) args.push('--override-time');
    if (config.caseLimit) args.push('--case-limit', config.caseLimit.toString());
    if (config.costLimit) args.push('--cost-limit', config.costLimit.toString());
    if (config.headless) args.push('--headless');
    if (config.verbose) args.push('--verbose');
    if (config.slabels) args.push('--slabels', config.slabels);

    // Mode-specific arguments
    switch (config.mode) {
      case 'query':
        if (config.queryConf) {
          if (typeof config.queryConf === 'string') {
            args.push('--query-conf', config.queryConf);
          } else {
            // Write config to temporary file
            const tempFile = this.writeTempConfig(config.queryConf);
            args.push('--query-conf', tempFile);
          }
        }
        if (config.queryPrefix) args.push('--query-prefix', config.queryPrefix);
        break;

      case 'docket':
        args.push('--docket-input', config.docketInput);
        if (config.docketMemList) args.push('--docket-mem-list', config.docketMemList);
        if (config.docketExcludeParties) args.push('--docket-exclude-parties');
        if (config.docketExclusions) args.push('--docket-exclusions', config.docketExclusions);
        if (config.docketUpdate) args.push('--docket-update');
        break;

      case 'summary':
        args.push('--summary-input', config.summaryInput);
        break;

      case 'member':
        args.push('--member-input', config.memberInput);
        break;

      case 'document':
        args.push('--document-input', config.documentInput);
        if (config.documentAllDocs) args.push('--document-all-docs');
        if (config.documentAtt !== undefined) {
          args.push(config.documentAtt ? '--document-att' : '--no-document-att');
        }
        if (config.documentSkipSeen !== undefined) {
          args.push(config.documentSkipSeen ? '--document-skip-seen' : '--no-document-skip-seen');
        }
        if (config.documentLimit) args.push('--document-limit', config.documentLimit.toString());
        break;
    }

    return args;
  }

  /**
   * Parse scraper output to extract results
   */
  private parseScraperOutput(output: string): ScraperResult {
    const result: ScraperResult = {
      success: 0,
      failure: 0,
      skipped: 0,
      totalCost: '$0.00'
    };

    // Parse success/failure/skipped counts
    const statsMatch = output.match(/\{'success': '(\d+)', 'failure': '(\d+)', 'skipped': '(\d+)'\}/);
    if (statsMatch) {
      result.success = parseInt(statsMatch[1]);
      result.failure = parseInt(statsMatch[2]);
      result.skipped = parseInt(statsMatch[3]);
    }

    // Parse total cost
    const costMatch = output.match(/Total cost: (\$[\d.]+)/);
    if (costMatch) {
      result.totalCost = costMatch[1];
    }

    // Parse log path
    const logMatch = output.match(/log file available at: (.+)/);
    if (logMatch) {
      result.logPath = logMatch[1].trim();
    }

    return result;
  }

  /**
   * Write temporary configuration file
   */
  private writeTempConfig(config: QueryConfig): string {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `query_config_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(config, null, 2));
    return tempFile;
  }
}
