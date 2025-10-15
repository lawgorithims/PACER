import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFileSync } from 'fs';

export interface DocketScraperOptions {
  username: string;
  password: string;
  headless?: boolean;
}

export class DocketScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private username: string;
  private password: string;
  private headless: boolean;

  constructor(options: DocketScraperOptions) {
    this.username = options.username;
    this.password = options.password;
    this.headless = options.headless !== false;
  }

  /**
   * Initialize browser and page
   */
  async init(): Promise<void> {
    console.log('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  /**
   * Navigate to case link and handle PACER login if needed
   */
  async navigateToCase(caseLink: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    console.log(`Navigating to: ${caseLink}`);
    await this.page.goto(caseLink, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait a bit for any redirects to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if we're on a login page
    const currentUrl = this.page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('login') || currentUrl.includes('csologin')) {
      console.log('Login page detected, authenticating...');
      await this.login();
    }
  }

  /**
   * Handle PACER login (JSF/PrimeFaces form)
   */
  private async login(): Promise<void> {
    if (!this.page) return;

    // Wait for the JSF login form
    const usernameSelector = 'input[id="loginForm:loginName"]';
    await this.page.waitForSelector(usernameSelector, { timeout: 10000 });

    console.log('Found login form, filling credentials...');

    // Fill in credentials
    await this.page.type(usernameSelector, this.username);
    await this.page.type('input[id="loginForm:password"]', this.password);

    // Submit form by clicking the login button
    console.log('Clicking login button...');
    await this.page.click('button[id="loginForm:fbtnLogin"]');
    
    // Wait for the page to process login
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Login clicked, checking for redaction dialog...');

    // Handle redaction agreement dialog if it appears
    await this.handleRedactionDialog();
  }

  /**
   * Handle redaction agreement dialog
   */
  private async handleRedactionDialog(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait for the dialog to be visible
      const dialogSelector = 'div[id="redactionConfirmation"]';
      await this.page.waitForSelector(dialogSelector, { visible: true, timeout: 10000 });

      console.log('Redaction dialog visible, accepting...');

      // Click the visible checkbox UI (not the hidden input)
      // PrimeFaces hides the real checkbox and uses a custom UI
      const checkboxDivSelector = 'div#regmsg\\:chkRedact div.ui-chkbox-box';
      await this.page.waitForSelector(checkboxDivSelector, { visible: true, timeout: 5000 });

      console.log('Clicking checkbox...');
      await this.page.click(checkboxDivSelector);

      // Wait a moment for the checkbox state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Click Continue button and wait for navigation
      const continueButtonSelector = 'button[id="regmsg:bpmConfirm"]';
      await this.page.waitForSelector(continueButtonSelector, { timeout: 5000 });
      
      console.log('Clicking Continue button...');
      await Promise.all([
        this.page.click(continueButtonSelector),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);

      console.log('Redaction agreement accepted, navigation complete');
    } catch (error) {
      // Dialog might not appear if already accepted, continue
      console.log('No redaction dialog (already accepted or not required). Error:', error);
    }
  }

  /**
   * Get docket report for a case
   */
  async getDocketReport(caseLink: string): Promise<any> {
    await this.navigateToCase(caseLink);

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Look for "Docket Report" link
    console.log('Looking for docket report link...');
    
    // Click on docket report link
    const docketLinkSelector = 'a[href*="DktRpt.pl"]';
    
    try {
      await this.page.waitForSelector(docketLinkSelector, { timeout: 5000 });
      console.log('Found docket report link, clicking...');
      
      await Promise.all([
        this.page.click(docketLinkSelector),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
      ]);
      
      console.log('Navigated to docket report configuration page');
    } catch (error) {
      console.log('Could not find docket report link:', error);
      throw new Error('Failed to navigate to docket report');
    }

    // Submit the docket report form
    await this.submitDocketReportForm();

    // Extract docket entries
    const docketData = await this.extractDocketData();

    return docketData;
  }

  /**
   * Submit the docket report form with default settings
   */
  private async submitDocketReportForm(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait for the Run Report button
      const runReportSelector = 'input[name="button1"][value="Run Report"]';
      await this.page.waitForSelector(runReportSelector, { timeout: 5000 });

      console.log('Found docket report form, submitting with default settings...');

      // Click "Run Report" button and wait for navigation
      await Promise.all([
        this.page.click(runReportSelector),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);

      console.log('Docket report generated');
    } catch (error) {
      console.log('Error submitting docket report form:', error);
      throw new Error('Failed to generate docket report');
    }
  }

  /**
   * Extract docket entries from current page
   */
  private async extractDocketData(): Promise<any> {
    if (!this.page) return null;

    console.log('Extracting docket data...');

    const data = await this.page.evaluate(() => {
      const entries: any[] = [];
      
      // Find the main docket table (has Date Filed, #, Docket Text headers)
      // @ts-expect-error - document is available in browser context
      const tables = document.querySelectorAll('table');
      let docketTable: any = null;
      
      for (const table of tables) {
        const headerText = table.textContent || '';
        if (headerText.includes('Date Filed') && headerText.includes('Docket Text')) {
          docketTable = table;
          break;
        }
      }

      if (docketTable) {
        const rows = docketTable.querySelectorAll('tr');
        
        rows.forEach((row: any, index: number) => {
          // Skip header row
          if (index === 0) return;
          
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const dateCell = cells[0];
            const numberCell = cells[1];
            const textCell = cells[2];

            // Extract date
            const date = dateCell.textContent?.trim() || '';

            // Extract document number and main link
            const docNumberLink = numberCell.querySelector('a');
            const docNumber = numberCell.textContent?.trim() || '';
            const docLink = docNumberLink ? docNumberLink.getAttribute('href') : null;

            // Extract all links from the docket text (main doc + attachments)
            const allLinks: any[] = [];
            const links = textCell.querySelectorAll('a');
            links.forEach((link: any) => {
              const href = link.getAttribute('href');
              const linkText = link.textContent?.trim() || '';
              if (href && href.includes('/doc1/')) {
                allLinks.push({
                  text: linkText,
                  url: href.startsWith('http') ? href : `https://ecf.nmd.uscourts.gov${href}`
                });
              }
            });

            // Extract docket text
            const docketText = textCell.textContent?.trim() || '';

            entries.push({
              date: date,
              documentNumber: docNumber,
              documentLink: docLink ? (docLink.startsWith('http') ? docLink : `https://ecf.nmd.uscourts.gov${docLink}`) : null,
              docketText: docketText,
              links: allLinks
            });
          }
        });
      }

      // Extract case metadata
      const caseInfo = {
        caseNumber: '',
        caseTitle: '',
        judge: '',
        dateFiled: '',
        dateTerminated: ''
      };

      // Try to extract case header info
      // @ts-expect-error - document is available in browser context
      const h3 = document.querySelector('h3');
      if (h3) {
        const headerText = h3.textContent || '';
        const caseNumMatch = headerText.match(/CASE #:\s*([^\n]+)/);
        if (caseNumMatch) {
          caseInfo.caseNumber = caseNumMatch[1].trim();
        }
      }

      return {
        caseInfo,
        entries,
        totalEntries: entries.length
      };
    });

    console.log(`Extracted ${data.totalEntries} docket entries`);
    return data;
  }

  /**
   * Save docket data to file
   */
  async saveDocketData(caseLink: string, outputFile: string): Promise<void> {
    const data = await this.getDocketReport(caseLink);
    writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`Docket data saved to ${outputFile}`);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }
}

