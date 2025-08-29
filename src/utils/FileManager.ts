import * as fs from 'fs';
import * as path from 'path';
import { CaseInfo, DocumentInfo, DocketEntry } from '../types';

export class FileManager {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get the court directory path
   */
  getCourtPath(court: string): string {
    return path.join(this.basePath, court);
  }

  /**
   * Get the queries directory path
   */
  getQueriesPath(court: string): string {
    return path.join(this.getCourtPath(court), 'queries');
  }

  /**
   * Get the HTML directory path
   */
  getHtmlPath(court: string): string {
    return path.join(this.getCourtPath(court), 'html');
  }

  /**
   * Get the JSON directory path
   */
  getJsonPath(court: string): string {
    return path.join(this.getCourtPath(court), 'json');
  }

  /**
   * Get the documents directory path
   */
  getDocsPath(court: string): string {
    return path.join(this.getCourtPath(court), 'docs');
  }

  /**
   * Get the summaries directory path
   */
  getSummariesPath(court: string): string {
    return path.join(this.getCourtPath(court), 'summaries');
  }

  /**
   * Get the members directory path
   */
  getMembersPath(court: string): string {
    return path.join(this.getCourtPath(court), 'members');
  }

  /**
   * List all query result files
   */
  listQueryFiles(court: string): string[] {
    const queriesPath = this.getQueriesPath(court);
    if (!fs.existsSync(queriesPath)) {
      return [];
    }

    return fs.readdirSync(queriesPath)
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(queriesPath, file));
  }

  /**
   * List all HTML docket files
   */
  listHtmlFiles(court: string, year?: string): string[] {
    const htmlPath = this.getHtmlPath(court);
    if (!fs.existsSync(htmlPath)) {
      return [];
    }

    if (year) {
      const yearPath = path.join(htmlPath, year);
      if (!fs.existsSync(yearPath)) {
        return [];
      }
      return fs.readdirSync(yearPath)
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(yearPath, file));
    }

    // Recursively find all HTML files
    const files: string[] = [];
    this.findHtmlFilesRecursive(htmlPath, files);
    return files;
  }

  /**
   * List all JSON files
   */
  listJsonFiles(court: string, year?: string): string[] {
    const jsonPath = this.getJsonPath(court);
    if (!fs.existsSync(jsonPath)) {
      return [];
    }

    if (year) {
      const yearPath = path.join(jsonPath, year);
      if (!fs.existsSync(yearPath)) {
        return [];
      }
      return fs.readdirSync(yearPath)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(yearPath, file));
    }

    // Recursively find all JSON files
    const files: string[] = [];
    this.findJsonFilesRecursive(jsonPath, files);
    return files;
  }

  /**
   * List all document files
   */
  listDocumentFiles(court: string, year?: string): DocumentInfo[] {
    const docsPath = this.getDocsPath(court);
    if (!fs.existsSync(docsPath)) {
      return [];
    }

    const documents: DocumentInfo[] = [];
    
    if (year) {
      const yearPath = path.join(docsPath, year);
      if (fs.existsSync(yearPath)) {
        this.scanDocumentDirectory(yearPath, documents);
      }
    } else {
      // Scan all year directories
      const yearDirs = fs.readdirSync(docsPath)
        .filter(dir => fs.statSync(path.join(docsPath, dir)).isDirectory());
      
      for (const yearDir of yearDirs) {
        const yearPath = path.join(docsPath, yearDir);
        this.scanDocumentDirectory(yearPath, documents);
      }
    }

    return documents;
  }

  /**
   * Get case information from a JSON file
   */
  getCaseInfo(jsonFilePath: string): CaseInfo | null {
    try {
      const content = fs.readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(content);
      
      return {
        ucid: data.ucid || '',
        caseNumber: data.case_no || '',
        court: data.court || '',
        filingDate: data.filing_date,
        caseStatus: data.case_status,
        natureOfSuit: data.nature_of_suit
      };
    } catch (error) {
      console.error(`Error reading case info from ${jsonFilePath}:`, error);
      return null;
    }
  }

  /**
   * Get docket entries from a JSON file
   */
  getDocketEntries(jsonFilePath: string): DocketEntry[] {
    try {
      const content = fs.readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.docket_entries || !Array.isArray(data.docket_entries)) {
        return [];
      }

      return data.docket_entries.map((entry: any) => ({
        entryNumber: entry.entry_number || 0,
        filingDate: entry.filing_date || '',
        description: entry.description || '',
        documentNumber: entry.document_number,
        attachments: entry.attachments || []
      }));
    } catch (error) {
      console.error(`Error reading docket entries from ${jsonFilePath}:`, error);
      return [];
    }
  }

  /**
   * Create a CSV file with case information
   */
  createCaseCsv(court: string, outputPath: string, year?: string): void {
    const jsonFiles = this.listJsonFiles(court, year);
    const cases: CaseInfo[] = [];

    for (const jsonFile of jsonFiles) {
      const caseInfo = this.getCaseInfo(jsonFile);
      if (caseInfo) {
        cases.push(caseInfo);
      }
    }

    const csvContent = this.casesToCsv(cases);
    fs.writeFileSync(outputPath, csvContent);
  }

  /**
   * Create a CSV file with document information
   */
  createDocumentCsv(court: string, outputPath: string, year?: string): void {
    const documents = this.listDocumentFiles(court, year);
    const csvContent = this.documentsToCsv(documents);
    fs.writeFileSync(outputPath, csvContent);
  }

  /**
   * Check if a case has been downloaded
   */
  caseExists(court: string, ucid: string): boolean {
    const jsonFiles = this.listJsonFiles(court);
    const caseNumber = ucid.split(';;')[1];
    
    return jsonFiles.some(file => {
      const fileName = path.basename(file, '.json');
      return fileName.includes(caseNumber);
    });
  }

  /**
   * Check if documents exist for a case
   */
  documentsExist(court: string, ucid: string): boolean {
    const documents = this.listDocumentFiles(court);
    return documents.some(doc => doc.ucid === ucid);
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Recursively find HTML files
   */
  private findHtmlFilesRecursive(dir: string, files: string[]): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.findHtmlFilesRecursive(fullPath, files);
      } else if (item.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }

  /**
   * Recursively find JSON files
   */
  private findJsonFilesRecursive(dir: string, files: string[]): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.findJsonFilesRecursive(fullPath, files);
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  /**
   * Scan document directory for PDF files
   */
  private scanDocumentDirectory(dir: string, documents: DocumentInfo[]): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile() && item.endsWith('.pdf')) {
        // Parse filename to extract UCID and document number
        const parsed = this.parseDocumentFilename(item);
        if (parsed) {
          documents.push({
            ucid: parsed.ucid,
            docNo: parsed.docNo,
            fileName: item,
            filePath: fullPath,
            fileSize: stat.size,
            downloadDate: new Date(stat.mtime).toISOString()
          });
        }
      }
    }
  }

  /**
   * Parse document filename to extract UCID and document number
   */
  private parseDocumentFilename(filename: string): { ucid: string; docNo: string } | null {
    // Example: psc;;1-07-cv-00431_2_u378f444c_t250827.pdf
    const match = filename.match(/^(.+?)_(\d+)_u[0-9a-f]+_t\d+\.pdf$/);
    if (match) {
      return {
        ucid: match[1],
        docNo: match[2]
      };
    }
    return null;
  }

  /**
   * Convert cases to CSV format
   */
  private casesToCsv(cases: CaseInfo[]): string {
    const headers = ['ucid', 'caseNumber', 'court', 'filingDate', 'caseStatus', 'natureOfSuit'];
    const rows = cases.map(caseInfo => [
      caseInfo.ucid,
      caseInfo.caseNumber,
      caseInfo.court,
      caseInfo.filingDate || '',
      caseInfo.caseStatus || '',
      caseInfo.natureOfSuit || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Convert documents to CSV format
   */
  private documentsToCsv(documents: DocumentInfo[]): string {
    const headers = ['ucid', 'docNo', 'fileName', 'filePath', 'fileSize', 'downloadDate'];
    const rows = documents.map(doc => [
      doc.ucid,
      doc.docNo,
      doc.fileName,
      doc.filePath,
      doc.fileSize.toString(),
      doc.downloadDate
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
