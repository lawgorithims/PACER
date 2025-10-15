import { Environment } from './types.js';
import { writeFileSync } from 'fs';

const PCL_URLS = {
  production: 'https://pcl.uscourts.gov',
  qa: 'https://qa-pcl.uscourts.gov'
};

export interface CaseSearchCriteria {
  jurisdictionType?: string;
  caseId?: string;
  caseNumberFull?: string;
  caseTitle?: string;
  caseOffice?: string;
  caseNumber?: string;
  caseType?: string[];
  caseYear?: string;
  courtId?: string[];  // Array of court IDs
  dateFiledFrom?: string;
  dateFiledTo?: string;
  effectiveDateClosedFrom?: string;
  effectiveDateClosedTo?: string;
  federalBankruptcyChapter?: string[];
  dateDismissedFrom?: string;
  dateDismissedTo?: string;
  dateDischargedFrom?: string;
  dateDischargedTo?: string;
  natureOfSuit?: string[];
  jpmlNumber?: string;
  [key: string]: string | string[] | number | undefined;
}

export class PacerCaseSearch {
  private environment: Environment;

  constructor(environment: Environment = 'production') {
    this.environment = environment;
  }

  /**
   * Search for cases on a specific page
   */
  private async searchCasesPage(
    token: string,
    criteria: CaseSearchCriteria,
    page: number = 0
  ): Promise<any> {
    const searchUrl = `${PCL_URLS[this.environment]}/pcl-public-api/rest/cases/find?page=${page}`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-NEXT-GEN-CSO': token
      },
      body: JSON.stringify(criteria)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Case search failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  }

  /**
   * Search for cases and fetch all pages
   */
  async searchCases(
    token: string,
    criteria: CaseSearchCriteria
  ): Promise<any> {
    const allResults: any[] = [];
    let page = 0;
    let totalPages = 1;
    let firstResult: any;

    do {
      console.log(`Fetching page ${page + 1}...`);
      const result = await this.searchCasesPage(token, criteria, page);
      
      if (page === 0) {
        firstResult = result;
        totalPages = result.totalPages || 1;
      }

      if (result.content && result.content.length > 0) {
        allResults.push(...result.content);
      }

      page++;
    } while (page < totalPages);

    // Return the result structure with all content combined
    return {
      ...firstResult,
      content: allResults,
      numberOfElements: allResults.length,
      totalElements: allResults.length
    };
  }

  /**
   * Search for cases and save all results to a file
   */
  async searchAndSave(
    token: string,
    criteria: CaseSearchCriteria,
    outputFile: string = 'case-results.json'
  ): Promise<void> {
    console.log(`Searching with criteria:`, criteria);
    
    const results = await this.searchCases(token, criteria);
    
    // Save to file
    writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${outputFile}`);
    console.log(`Found ${results.content?.length || 0} cases`);
  }
}

