/**
 * Extract unique valid email addresses from text using RegEx.
 * @param {string} text
 * @returns {string[]}
 */
function extractEmails(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches.map((email) => email.toLowerCase()))];
}

/**
 * Pause execution for a given duration.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { extractEmails, sleep };
