// © Expense Tracker. All rights reserved.
// Put your COMPANY NAME here once - it updates the splash, login, settings, exports and trip shares.
export const COMPANY = ''; // e.g. 'Acme Technologies'
export const APP_NAME = 'Expense Tracker';
export const YEAR = 2026;
export const VERSION = '2.1.0';

export const COPYRIGHT = COMPANY ? `© ${YEAR} ${COMPANY}. All rights reserved.` : `© ${YEAR}. All rights reserved.`;
export const BRAND_LINE = COMPANY ? `by ${COMPANY}` : '';
export const MADE_BY = BRAND_LINE;
export const NOTICE =
  `${APP_NAME}, its name, logo, design and source code are protected by copyright. ` +
  'Copying, redistributing, reverse-engineering, re-branding or republishing this app, in whole or in part, ' +
  'without written permission from the owner is prohibited.';

// Added to every exported file so a copy can always be traced back to the original author.
export const EXPORT_HEADER = `${APP_NAME} v${VERSION} - ${COPYRIGHT}`;
