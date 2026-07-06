/**
 * LinkedIn Job Application Automation
 *
 * Workflow:
 * 1. Log into LinkedIn
 * 2. Search Posts for "JAVA DEVELOPER" AND "CONTRACT" (last 24 hours)
 * 3. Extract recruiter emails from post content
 * 4. Send formal application emails via Gmail with resume attached
 */

const { chromium } = require('playwright');
const { validateConfig } = require('./config');
const { loginToLinkedIn, searchAndExtractEmails } = require('./linkedin');
const { createGmailTransporter, sendApplicationEmails } = require('./email');

async function main() {
  let browser;
  let context;
  let page;

  console.log('='.repeat(60));
  console.log('LinkedIn Job Application Automation - Starting');
  console.log('='.repeat(60));

  try {
    const config = validateConfig();
    console.log(`[Config] Headless mode: ${config.browser.headless}`);
    console.log(`[Config] Resume path: ${config.resumePath}`);

    // --- Step 1: LinkedIn Login & Job Post Scraping ---
    console.log('\n--- Step 1 & 2: LinkedIn Login and Post Search ---\n');

    browser = await chromium.launch({
      headless: config.browser.headless,
      slowMo: config.browser.headless ? 0 : 50,
      args: ['--start-maximized'],
    });

    context = await browser.newContext({
      viewport: config.browser.headless ? { width: 1280, height: 800 } : null,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();
    page.setDefaultTimeout(30000);

    await loginToLinkedIn(page, config.linkedin);
    const recruiterEmails = await searchAndExtractEmails(page);

    // --- Step 3 & 4: Gmail Integration & Email Sending ---
    console.log('\n--- Step 3 & 4: Gmail Integration and Email Sending ---\n');

    const transporter = await createGmailTransporter(config.gmail);
    const results = await sendApplicationEmails(
      transporter,
      recruiterEmails,
      config.gmail,
      config.applicant,
      config.resumePath,
      config.emailDelayMs
    );

    console.log('\n' + '='.repeat(60));
    console.log('Workflow completed successfully');
    console.log(`Recruiter emails found: ${recruiterEmails.length}`);
    console.log(`Emails sent: ${results.sent}`);
    console.log(`Emails failed: ${results.failed}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n[ERROR] Workflow failed:', error.message);
    if (process.env.DEBUG === 'true') {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    if (browser) {
      console.log('\n[Cleanup] Closing browser...');
      await browser.close();
      console.log('[Cleanup] Browser closed');
    }
  }
}

main();
