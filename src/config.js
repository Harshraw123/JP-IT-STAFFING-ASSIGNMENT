require('dotenv').config();
const path = require('path');
const fs = require('fs');

const requiredEnvVars = [
  'LINKEDIN_EMAIL',
  'LINKEDIN_PASSWORD',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
];

function validateConfig() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill in your credentials.`
    );
  }

  const resumePath = path.resolve(
    process.cwd(),
    process.env.RESUME_PATH || './resume.pdf'
  );

  if (!fs.existsSync(resumePath)) {
    throw new Error(
      `Resume file not found at: ${resumePath}. Place your PDF resume at this path or update RESUME_PATH in .env.`
    );
  }

  return {
    linkedin: {
      email: process.env.LINKEDIN_EMAIL,
      password: process.env.LINKEDIN_PASSWORD,
    },
    gmail: {
      user: process.env.GMAIL_USER,
      appPassword: process.env.GMAIL_APP_PASSWORD,
    },
    browser: {
      headless: process.env.HEADLESS === 'true',
    },
    resumePath,
    emailDelayMs: Number(process.env.EMAIL_DELAY_MS) || 2500,
    applicant: {
      name: process.env.APPLICANT_NAME || 'Applicant',
      phone: process.env.APPLICANT_PHONE || '',
      linkedin: process.env.APPLICANT_LINKEDIN || '',
    },
    search: {
      keywords: '"JAVA DEVELOPER" AND "CONTRACT"',
    },
  };
}

module.exports = { validateConfig };
