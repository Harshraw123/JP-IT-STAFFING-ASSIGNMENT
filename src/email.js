const nodemailer = require('nodemailer');
const path = require('path');
const { sleep } = require('./utils');

const POSITION_TITLE = 'Java Developer (Contract)';

/**
 * Build a professional job application email.
 * @param {{ name: string, phone: string, linkedin: string }} applicant
 * @returns {{ subject: string, text: string, html: string }}
 */
function buildApplicationEmail(applicant) {
  const subject = `Application for ${POSITION_TITLE} Position`;

  const contactLines = [
    applicant.phone ? `Phone: ${applicant.phone}` : null,
    applicant.linkedin ? `LinkedIn: ${applicant.linkedin}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `Dear Hiring Manager,

I am writing to express my strong interest in the ${POSITION_TITLE} position referenced in your recent LinkedIn post.

With extensive experience in Java development, Spring Boot, REST APIs, microservices, and enterprise application design, I am confident I can deliver immediate value on a contract engagement. I am accustomed to fast-paced delivery environments and collaborate effectively with distributed teams.

Key highlights of my background:
- Strong proficiency in Java (8+), Spring Framework, Hibernate/JPA, and Maven/Gradle
- Experience building scalable backend services and integrating with cloud platforms
- Solid understanding of SDLC, Agile practices, code reviews, and production support
- Available to start on short notice for contract assignments

I have attached my resume for your review. I would welcome the opportunity to discuss how my skills align with your requirements.

Thank you for your time and consideration.

Best regards,
${applicant.name}
${contactLines}`;

  const html = `
    <p>Dear Hiring Manager,</p>
    <p>I am writing to express my strong interest in the <strong>${POSITION_TITLE}</strong> position referenced in your recent LinkedIn post.</p>
    <p>With extensive experience in Java development, Spring Boot, REST APIs, microservices, and enterprise application design, I am confident I can deliver immediate value on a contract engagement. I am accustomed to fast-paced delivery environments and collaborate effectively with distributed teams.</p>
    <p><strong>Key highlights of my background:</strong></p>
    <ul>
      <li>Strong proficiency in Java (8+), Spring Framework, Hibernate/JPA, and Maven/Gradle</li>
      <li>Experience building scalable backend services and integrating with cloud platforms</li>
      <li>Solid understanding of SDLC, Agile practices, code reviews, and production support</li>
      <li>Available to start on short notice for contract assignments</li>
    </ul>
    <p>I have attached my resume for your review. I would welcome the opportunity to discuss how my skills align with your requirements.</p>
    <p>Thank you for your time and consideration.</p>
    <p>Best regards,<br/>
    <strong>${applicant.name}</strong><br/>
    ${applicant.phone ? `Phone: ${applicant.phone}<br/>` : ''}
    ${applicant.linkedin ? `LinkedIn: <a href="${applicant.linkedin}">${applicant.linkedin}</a>` : ''}
    </p>
  `;

  return { subject, text, html };
}

/**
 * Create and verify a Nodemailer Gmail transporter.
 * @param {{ user: string, appPassword: string }} gmailConfig
 */
async function createGmailTransporter(gmailConfig) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailConfig.user,
      pass: gmailConfig.appPassword,
    },
  });

  await transporter.verify();
  console.log('[Gmail] Successfully authenticated with Gmail');
  return transporter;
}

/**
 * Send application emails to all recruiter addresses.
 * @param {import('nodemailer').Transporter} transporter
 * @param {string[]} recipients
 * @param {{ user: string }} gmailConfig
 * @param {{ name: string, phone: string, linkedin: string }} applicant
 * @param {string} resumePath
 * @param {number} delayMs
 */
async function sendApplicationEmails(
  transporter,
  recipients,
  gmailConfig,
  applicant,
  resumePath,
  delayMs
) {
  if (recipients.length === 0) {
    console.log('[Gmail] No recruiter emails to send. Skipping email step.');
    return { sent: 0, failed: 0 };
  }

  const { subject, text, html } = buildApplicationEmail(applicant);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const to = recipients[i];

    try {
      console.log(`[Gmail] Sending application email to ${to} (${i + 1}/${recipients.length})...`);

      await transporter.sendMail({
        from: `"${applicant.name}" <${gmailConfig.user}>`,
        to,
        subject,
        text,
        html,
        attachments: [
          {
            filename: path.basename(resumePath),
            path: resumePath,
            contentType: 'application/pdf',
          },
        ],
      });

      sent++;
      console.log(`[Gmail] Email sent successfully to ${to}`);
    } catch (error) {
      failed++;
      console.error(`[Gmail] Failed to send email to ${to}:`, error.message);
    }

    if (i < recipients.length - 1) {
      console.log(`[Gmail] Waiting ${delayMs}ms before next email...`);
      await sleep(delayMs);
    }
  }

  console.log(`[Gmail] Email batch complete. Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

module.exports = { createGmailTransporter, sendApplicationEmails, buildApplicationEmail };
