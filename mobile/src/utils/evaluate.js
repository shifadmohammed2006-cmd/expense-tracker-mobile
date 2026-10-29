// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.

// A tiny, safe arithmetic evaluator for the amount field and the calculator:
// numbers, + - * / and parentheses only. No names, no functions, no network - so
// it can never execute anything the person did not type as plain maths.
const TOKEN = /\d+(?:\.\d+)?|[+\-*/()]|\s/g;

export function evaluateExpression(text) {
  const src = String(text || '');
  if (!/[+\-*/(]/.test(src)) {
    // Plain number (allow a comma as the decimal separator).
    const plain = Number(src.replace(',', '.'));
    return Number.isFinite(plain) ? plain : NaN;
  }

  const tokens = (src.match(TOKEN) || []).filter((t) => t.trim());
  // The regex must cover every character - anything else (letters, stray symbols) is rejected.
  if (!tokens.length || tokens.join('') !== src.replace(/\s/g, '')) return NaN;

  // Shunting-yard: infix -> postfix, then evaluate.
  const out = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  let prev = null;

  for (const raw of tokens) {
    const t = raw.trim();
    if (!t) continue;
    if (/\d/.test(t[0]) || (t[0] === '.' && t.length > 1)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return NaN;
      out.push(n);
      prev = 'num';
    } else if (t === '(') {
      if (prev === 'num') return NaN; // implicit multiplication not supported
      ops.push(t);
      prev = '(';
    } else if (t === ')') {
      if (prev === 'op' || prev === '(') return NaN;
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
      if (!ops.length) return NaN; // unbalanced
      ops.pop();
      prev = ')';
    } else if (t in prec) {
      // Support leading minus as 0 - x, and binary minus after '(' or an operator.
      if (t === '-' && (prev === null || prev === 'op' || prev === '(')) out.push(0);
      else if (prev === null || prev === 'op' || prev === '(') return NaN;
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) out.push(ops.pop());
      ops.push(t);
      prev = 'op';
    } else {
      return NaN;
    }
  }
  if (prev === 'op') return NaN;
  while (ops.length) {
    const op = ops.pop();
    if (op === '(') return NaN;
    out.push(op);
  }

  const stack = [];
  for (const t of out) {
    if (typeof t === 'number') stack.push(t);
    else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return NaN;
      stack.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : b === 0 ? NaN : a / b);
    }
  }
  if (stack.length !== 1) return NaN;
  return Number.isFinite(stack[0]) ? stack[0] : NaN;
}
