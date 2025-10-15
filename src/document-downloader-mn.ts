import puppeteer, { Browser, Page } from 'puppeteer';
import { mkdirSync, existsSync, readdirSync, createWriteStream } from 'fs';
import { join } from 'path';
import axios from 'axios';

export interface DocumentDownloaderOptions {
  username: string;
  password: string;
  headless?: boolean;
  downloadPath?: string;
}

export class DocumentDownloaderMN {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private username: string;
  private password: string;
  private headless: boolean;
  private downloadPath: string;

  constructor(options: DocumentDownloaderOptions) {
    this.username = options.username;
    this.password = options.password;
    this.headless = options.headless !== false;
    this.downloadPath = options.downloadPath || './downloads';
    
    // Create download directory if it doesn't exist
    if (!existsSync(this.downloadPath)) {
      mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  /**
   * Initialize browser and page with download settings
   */
  async init(): Promise<void> {
    console.log('Launching browser for Minnesota downloads...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-features=InternalPdfViewer'  // Disable PDF viewer to allow raw downloads
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set download behavior using CDP session
    const client = await this.page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allowAndName',
      downloadPath: this.downloadPath,
      eventsEnabled: true
    });
  }

  /**
   * Handle login if on login page
   */
  private async handleLoginIfNeeded(): Promise<void> {
    if (!this.page) return;

    const currentUrl = this.page.url();
    
    if (currentUrl.includes('login') || currentUrl.includes('csologin')) {
      console.log('Login required...');
      
      // Wait for login form
      const usernameSelector = 'input[id="loginForm:loginName"]';
      await this.page.waitForSelector(usernameSelector, { timeout: 10000 });
      
      // Fill credentials
      await this.page.type(usernameSelector, this.username);
      await this.page.type('input[id="loginForm:password"]', this.password);
      
      // Click login
      await this.page.click('button[id="loginForm:fbtnLogin"]');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Handle redaction dialog
      await this.handleRedactionDialog();
    }
  }

  /**
   * Handle redaction agreement dialog
   */
  private async handleRedactionDialog(): Promise<void> {
    if (!this.page) return;

    try {
      const dialogSelector = 'div[id="redactionConfirmation"]';
      await this.page.waitForSelector(dialogSelector, { visible: true, timeout: 10000 });

      console.log('Accepting redaction dialog...');

      const checkboxDivSelector = 'div#regmsg\\:chkRedact div.ui-chkbox-box';
      await this.page.waitForSelector(checkboxDivSelector, { visible: true, timeout: 5000 });
      await this.page.click(checkboxDivSelector);
      await new Promise(resolve => setTimeout(resolve, 1000));

      await Promise.all([
        this.page.click('button[id="regmsg:bpmConfirm"]'),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);

      console.log('Redaction accepted');
    } catch (error) {
      console.log('No redaction dialog needed');
    }
  }

  /**
   * Download a single document for Minnesota court
   */
  async downloadDocument(documentUrl: string, filename?: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    console.log(`Navigating to: ${documentUrl}`);
    await this.page.goto(documentUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle login if needed
    await this.handleLoginIfNeeded();

    // Check what type of page we're on
    const pageType = await this.page.evaluate(() => {
      // @ts-expect-error - document is available in browser context
      const viewButton = document.querySelector('input[value="View Document"]');
      // @ts-expect-error - document is available in browser context
      const downloadButton = document.querySelector('input[id="download_button"]');
      
      if (viewButton) return 'single';
      if (downloadButton) return 'multi';
      return 'unknown';
    });

    console.log(`Page type: ${pageType}`);

    if (pageType === 'single') {
      return await this.downloadSingleDocument(filename);
    } else if (pageType === 'multi') {
      return await this.downloadMultiDocument(filename);
    } else {
      throw new Error('Unknown document page type');
    }
  }

  /**
   * Download from single document page (with "View Document" button)
   */
  private async downloadSingleDocument(filename?: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('Downloading single document...');

    const finalFilename = filename || `document_${Date.now()}.pdf`;
    const filepath = join(this.downloadPath, finalFilename);

    // Extract goDLS parameters from the form's onsubmit
    console.log('Extracting goDLS parameters from form...');
    
    const formData = await this.page.evaluate(() => {
      // @ts-expect-error - document is available in browser context
      const form = document.querySelector('form[onsubmit*="goDLS"]') as HTMLFormElement;
      if (!form) {
        throw new Error('Cannot find form with goDLS');
      }

      const onsubmitStr = form.getAttribute('onsubmit') || '';
      // Parse: goDLS('/doc1/101111194113','228360','12','1','','1','','','')
      const match = onsubmitStr.match(/goDLS\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)'\)/);
      
      if (!match) {
        throw new Error('Cannot parse goDLS parameters');
      }

      return {
        action: match[1],      // URL path
        caseid: match[2],      // caseid parameter
        de_seq_num: match[3],  // de_seq_num parameter
        got_receipt: match[4], // got_receipt parameter
        pdf_header: match[5],  // pdf_header parameter
        pdf_toggle_possible: match[6], // pdf_toggle_possible parameter
        magic_num: match[7],   // magic_num parameter
        hdr: match[8],         // hdr parameter
        psf_report: match[9]   // psf_report parameter
      };
    });

    console.log('Extracted goDLS parameters:', formData);

    // Build POST form data
    const postData = new URLSearchParams();
    if (formData.caseid) postData.append('caseid', formData.caseid);
    if (formData.de_seq_num) postData.append('de_seq_num', formData.de_seq_num);
    if (formData.got_receipt) postData.append('got_receipt', formData.got_receipt);
    if (formData.pdf_header) postData.append('pdf_header', formData.pdf_header);
    if (formData.pdf_toggle_possible) postData.append('pdf_toggle_possible', formData.pdf_toggle_possible);
    if (formData.magic_num) postData.append('magic_num', formData.magic_num);
    if (formData.hdr) postData.append('hdr', formData.hdr);
    if (formData.psf_report) postData.append('psf_report', formData.psf_report);

    // Get authenticated cookies
    const cookies = await this.page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    console.log('Making POST request to download PDF...');
    
    // Construct full URL for Minnesota court
    const fullUrl = formData.action.startsWith('http') 
      ? formData.action 
      : `https://ecf.mnd.uscourts.gov${formData.action}`;

    // Make POST request with form data
    // Note: Setting Referer to Minnesota court to bypass CSRF warning page
    const response = await axios({
      url: fullUrl,
      method: 'POST',
      data: postData.toString(),
      responseType: 'stream',
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://ecf.mnd.uscourts.gov/',  // Minnesota court URL
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    // Pipe the response to a file
    const writer = createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded to: ${filepath}`);
        resolve(filepath);
      });

      writer.on('error', (error) => {
        console.error('Download error:', error);
        reject(error);
      });
    });
  }

  /**
   * Download from multi-document page (with checkboxes)
   */
  private async downloadMultiDocument(filename?: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('Multi-document page - selecting all documents...');

    // Check all checkboxes
    await this.page.evaluate(() => {
      // @ts-expect-error - document is available in browser context
      const checkboxes = document.querySelectorAll('input[type="checkbox"][name^="document_"]');
      checkboxes.forEach((cb: any) => {
        if (!cb.checked) cb.click();
      });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Click "Download Selected" and wait for confirmation page
    console.log('Clicking Download Selected...');
    await Promise.all([
      this.page.click('input[id="download_button"]'),
      this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);

    console.log('On confirmation page, checking cost...');

    // Extract cost information
    const costInfo = await this.page.evaluate(() => {
      // @ts-expect-error - document is available in browser context
      const text = document.body.textContent || '';
      const pagesMatch = text.match(/Total Pages:\s*(\d+)/);
      const costMatch = text.match(/Total Cost:\s*([\d.]+)/);
      return {
        pages: pagesMatch ? pagesMatch[1] : '?',
        cost: costMatch ? costMatch[1] : '?'
      };
    });

    console.log(`Total Pages: ${costInfo.pages}, Total Cost: $${costInfo.cost}`);

    // Get list of files before download
    const filesBefore = existsSync(this.downloadPath) ? readdirSync(this.downloadPath) : [];

    // Click "Download Documents" button
    console.log('Clicking Download Documents button...');
    await this.page.click('input[value="Download Documents"]');

    // Wait for new file to appear in downloads folder
    console.log('Waiting for download to complete...');
    const downloadedFile = await this.waitForNewFile(filesBefore, filename);

    console.log(`Download complete: ${downloadedFile}`);

    return downloadedFile;
  }

  /**
   * Wait for a new file to appear in the download directory
   */
  private async waitForNewFile(filesBefore: string[], preferredName?: string): Promise<string> {
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      if (!existsSync(this.downloadPath)) continue;

      const filesNow = readdirSync(this.downloadPath);
      const newFiles = filesNow.filter(f => !filesBefore.includes(f) && !f.endsWith('.crdownload'));

      if (newFiles.length > 0) {
        const downloadedFile = newFiles[0];
        console.log(`New file detected: ${downloadedFile}`);
        return join(this.downloadPath, downloadedFile);
      }
    }

    throw new Error('Download timeout - no new file appeared');
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
