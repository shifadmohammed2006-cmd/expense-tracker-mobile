// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
// Express 4 doesn't catch rejected promises from async handlers; this forwards them to the error handler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
