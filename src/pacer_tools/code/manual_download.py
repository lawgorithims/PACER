#!/usr/bin/env python3
"""
Manual Download Script for USA v JUSTIN Case
Uses SCALES OKN scraper's login but manually navigates to download the indictment
"""

import json
import time
import logging
import sys
from pathlib import Path
from seleniumrequests import Firefox
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Import SCALES OKN tools
sys.path.append(str(Path(__file__).resolve().parents[1]))
from support import fhandle_tools as ftools
from downloader import scraper_tools as stools

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handle_acknowledgment_form(browser):
    """Handle any acknowledgment forms that might appear"""
    try:
        # Check for acknowledgment forms
        if "acknowledgment" in browser.page_source.lower() or "agreement" in browser.page_source.lower():
            logger.info("Found acknowledgment form, looking for accept button...")
            
            # Look for various types of accept buttons
            accept_selectors = [
                "input[type='submit'][value*='Accept']",
                "input[type='submit'][value*='Continue']",
                "input[type='submit'][value*='Agree']",
                "button[type='submit']",
                "input[type='checkbox']",
                "a[href*='continue']"
            ]
            
            for selector in accept_selectors:
                try:
                    elements = browser.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        logger.info(f"Found element with selector: {selector}")
                        elements[0].click()
                        time.sleep(2)
                        return True
                except:
                    continue
            
            logger.info("No accept button found, you may need to manually accept")
            return False
    except Exception as e:
        logger.error(f"Error handling acknowledgment form: {e}")
        return False

def main():
    # Load credentials
    with open('auth.json', 'r') as f:
        auth = json.load(f)
    
    # Initialize browser
    browser = Firefox()
    
    try:
        # Login to Minnesota District Court
        login_url = ftools.get_pacer_url('mnd', 'login')
        logger.info(f"Logging into: {login_url}")
        
        success = stools.login(browser, auth, login_url, logging=logger)
        if not success:
            logger.error("Login failed")
            return
        
        logger.info("Login successful!")
        
        # Handle any acknowledgment forms
        handle_acknowledgment_form(browser)
        
        # Navigate to case query page
        query_url = ftools.get_pacer_url('mnd', 'query')
        logger.info(f"Navigating to query page: {query_url}")
        browser.get(query_url)
        
        # Wait for page to load
        time.sleep(3)
        
        # Handle any acknowledgment forms again
        handle_acknowledgment_form(browser)
        
        logger.info("Current URL: " + browser.current_url)
        logger.info("Page title: " + browser.title)
        
        # Look for case number input with different possible names
        case_input_selectors = [
            "input[name='case_no']",
            "input[name='case_number']",
            "input[name='case']",
            "input[id*='case']",
            "input[placeholder*='case']"
        ]
        
        case_input = None
        for selector in case_input_selectors:
            try:
                case_input = browser.find_element(By.CSS_SELECTOR, selector)
                logger.info(f"Found case input with selector: {selector}")
                break
            except:
                continue
        
        if case_input:
            case_input.clear()
            case_input.send_keys("0:25-cr-54")
            
            # Look for submit button
            submit_selectors = [
                "input[type='submit']",
                "button[type='submit']",
                "input[value*='Submit']",
                "input[value*='Search']",
                "button[onclick*='submit']"
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = browser.find_element(By.CSS_SELECTOR, selector)
                    logger.info(f"Found submit button with selector: {selector}")
                    break
                except:
                    continue
            
            if submit_button:
                submit_button.click()
                time.sleep(5)
                
                logger.info("Current URL: " + browser.current_url)
                
                # Check if we got results
                if "No information was found" in browser.page_source:
                    logger.error("No case found")
                    return
                
                # Look for case links
                case_links = browser.find_elements(By.CSS_SELECTOR, "a[href*='DktRpt']")
                if case_links:
                    logger.info(f"Found {len(case_links)} case links")
                    # Click the first case link
                    case_links[0].click()
                    time.sleep(3)
                    
                    # Now we should be on the docket page
                    logger.info("Current URL: " + browser.current_url)
                    
                    # Look for document links (Docket No. 1 - the indictment)
                    doc_links = browser.find_elements(By.CSS_SELECTOR, "a[href*='doc1']")
                    if doc_links:
                        logger.info(f"Found {len(doc_links)} document links")
                        # Click the first document link (should be Docket No. 1)
                        doc_links[0].click()
                        time.sleep(3)
                        
                        logger.info("Document download initiated")
                        logger.info("Current URL: " + browser.current_url)
                        
                        # Wait for download to complete
                        time.sleep(10)
                        logger.info("Download should be complete")
                    else:
                        logger.error("No document links found")
                else:
                    logger.error("No case links found")
            else:
                logger.error("No submit button found")
        else:
            logger.error("No case number input found")
            logger.info("Available form elements:")
            inputs = browser.find_elements(By.TAG_NAME, "input")
            for inp in inputs:
                name = inp.get_attribute("name") or inp.get_attribute("id") or "no-name"
                logger.info(f"  Input: {name}")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        # Keep browser open for manual inspection
        input("Press Enter to close browser...")
        browser.quit()

if __name__ == "__main__":
    main()
