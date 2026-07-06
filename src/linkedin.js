const { extractEmails } = require('./utils');

const LOGIN_URL = 'https://www.linkedin.com/login';
const SEARCH_KEYWORDS = '"JAVA DEVELOPER" AND "CONTRACT"';

/**
 * Log into LinkedIn and wait for the feed/dashboard to load.
 * @param {import('playwright').Page} page
 * @param {{ email: string, password: string }} credentials
 */
async function loginToLinkedIn(page, credentials) {
  console.log('[LinkedIn] Navigating to login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForSelector('#username', { timeout: 30000 });
  await page.fill('#username', credentials.email);
  await page.fill('#password', credentials.password);

  console.log('[LinkedIn] Submitting credentials...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // Handle optional security checkpoint or "Remember me" prompts
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  if (currentUrl.includes('/checkpoint') || currentUrl.includes('/challenge')) {
    throw new Error(
      'LinkedIn security checkpoint detected. Complete verification manually in the browser, then re-run the script.'
    );
  }

  // Wait for feed/dashboard indicators
  const feedSelectors = [
    'div.feed-shared-update-v2',
    'main.scaffold-layout__main',
    'nav.global-nav',
    'button[aria-label="Start a post"]',
  ];

  let feedLoaded = false;
  for (const selector of feedSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 15000 });
      feedLoaded = true;
      break;
    } catch {
      // try next selector
    }
  }

  if (!feedLoaded) {
    await page.waitForTimeout(5000);
  }

  console.log('[LinkedIn] Successfully logged into LinkedIn');
}

/**
 * Search LinkedIn Posts for contract Java developer roles from the last 24 hours.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>} Unique recruiter emails found in posts
 */
async function searchAndExtractEmails(page) {
  console.log('[LinkedIn] Searching for posts:', SEARCH_KEYWORDS);

  const encodedKeywords = encodeURIComponent(SEARCH_KEYWORDS);
  const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodedKeywords}&origin=GLOBAL_SEARCH_HEADER`;

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Select "Posts" tab (not Jobs)
  await clickPostsTab(page);

  // Apply "Past 24 hours" / date filter
  await applyPast24HoursFilter(page);

  // Scroll to load more posts
  await scrollToLoadPosts(page);

  const emails = await scrapePostEmails(page);

  console.log(`[LinkedIn] Found ${emails.length} unique recruiter email(s)`);
  return emails;
}

/**
 * Click the Posts tab on LinkedIn search results.
 * @param {import('playwright').Page} page
 */
async function clickPostsTab(page) {
  console.log('[LinkedIn] Selecting Posts tab...');

  const postsTabSelectors = [
    'button:has-text("Posts")',
    'a:has-text("Posts")',
    '[role="tab"]:has-text("Posts")',
    'button.search-reusables__filter-pill-button:has-text("Posts")',
  ];

  for (const selector of postsTabSelectors) {
    try {
      const tab = page.locator(selector).first();
      if (await tab.isVisible({ timeout: 3000 })) {
        await tab.click();
        await page.waitForTimeout(2000);
        console.log('[LinkedIn] Posts tab selected');
        return;
      }
    } catch {
      // try next selector
    }
  }

  console.warn('[LinkedIn] Posts tab not found via selectors; continuing with current view');
}

/**
 * Apply the "Past 24 hours" date filter on search results.
 * @param {import('playwright').Page} page
 */
async function applyPast24HoursFilter(page) {
  console.log('[LinkedIn] Applying Past 24 hours filter...');

  const dateFilterButtonSelectors = [
    'button:has-text("Date posted")',
    'button:has-text("Date")',
    'button[aria-label*="Date"]',
    'button.search-reusables__filter-pill-button:has-text("Date")',
  ];

  let filterOpened = false;
  for (const selector of dateFilterButtonSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        filterOpened = true;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!filterOpened) {
    console.warn('[LinkedIn] Date filter button not found; results may include older posts');
    return;
  }

  await page.waitForTimeout(1000);

  const past24Selectors = [
    'label:has-text("Past 24 hours")',
    'span:has-text("Past 24 hours")',
    'button:has-text("Past 24 hours")',
    '[role="radio"]:has-text("Past 24 hours")',
    'div:has-text("Past 24 hours")',
  ];

  for (const selector of past24Selectors) {
    try {
      const option = page.locator(selector).first();
      if (await option.isVisible({ timeout: 3000 })) {
        await option.click();
        await page.waitForTimeout(2000);

        // Some UIs require clicking "Show results"
        const showResults = page.locator('button:has-text("Show results")').first();
        if (await showResults.isVisible({ timeout: 2000 }).catch(() => false)) {
          await showResults.click();
          await page.waitForTimeout(2000);
        }

        console.log('[LinkedIn] Past 24 hours filter applied');
        return;
      }
    } catch {
      // try next
    }
  }

  console.warn('[LinkedIn] Past 24 hours option not found; continuing without date filter');
}

/**
 * Scroll the page to lazy-load additional posts.
 * @param {import('playwright').Page} page
 */
async function scrollToLoadPosts(page) {
  console.log('[LinkedIn] Scrolling to load more posts...');

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1500);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

/**
 * Scrape visible post content and extract recruiter emails.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
async function scrapePostEmails(page) {
  console.log('[LinkedIn] Scraping post content for recruiter emails...');

  const postSelectors = [
    'div.feed-shared-update-v2',
    'div.update-components-text',
    'div.feed-shared-inline-show-more-text',
    'li.reusable-search__result-container',
    'div.search-results-container div[data-urn]',
  ];

  const allEmails = new Set();

  for (const selector of postSelectors) {
    const elements = await page.locator(selector).all();
    for (const element of elements) {
      try {
        const text = await element.innerText();
        const found = extractEmails(text);
        found.forEach((email) => {
          if (!allEmails.has(email)) {
            allEmails.add(email);
            console.log(`[LinkedIn] Found email: ${email}`);
          }
        });
      } catch {
        // skip unreadable elements
      }
    }
  }

  // Fallback: scan entire page body if no emails found in post containers
  if (allEmails.size === 0) {
    const bodyText = await page.locator('body').innerText();
    const found = extractEmails(bodyText);
    found.forEach((email) => {
      allEmails.add(email);
      console.log(`[LinkedIn] Found email: ${email}`);
    });
  }

  return [...allEmails];
}

module.exports = { loginToLinkedIn, searchAndExtractEmails };
