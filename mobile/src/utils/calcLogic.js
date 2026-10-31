// © Expense Tracker. All rights reserved.
// Samsung-style calculator brain: pure functions, no screen code, so it is easy to test.
// State: { expr, result, done, history }  (expr uses the display symbols + − × ÷ ( ) % . and digits)
import { evaluateExpression } from './evaluate';

export const EMPTY_CALC = { expr: '', result: null, done: false, history: [] };

const OPS = '+−×÷';
const isOp = (c) => !!c && OPS.includes(c);
const isDigit = (c) => !!c && c >= '0' && c <= '9';
const toEval = (s) => s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
const openCount = (s) => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
const closeAll = (s) => s + ')'.repeat(Math.max(openCount(s), 0));
const lastNum = (s) => (s.match(/(\d+\.?\d*|\.\d+)$/) || [])[0] || null;
const trimTail = (s) => s.replace(/[+−×÷(.]+$/, '');
const MAX_LEN = 60;

// 0.1 + 0.2 -> "0.3" (no floating-point noise)
export function fmtNum(n) {
  if (!Number.isFinite(n)) return 'Error';
  return String(Number(n.toPrecision(12)));
}

const calc = (expr) => evaluateExpression(toEval(closeAll(trimTail(expr))));
const hasMath = (expr) => /[+−×÷(]/.test(expr.replace(/^−/, ''));

// Grey "= 40" line shown under the expression while typing.
export function previewOf(s) {
  if (s.done || !hasMath(s.expr)) return null;
  const r = calc(s.expr);
  return Number.isFinite(r) ? fmtNum(r) : null;
}

export const isError = (result) => !!result && !/^-?\d[\d.]*(e[+-]?\d+)?$/i.test(result);

// ---- showing numbers: Indian grouping (12,34,567), real minus sign ----
const groupInt = (i) => {
  const last3 = i.slice(-3);
  const rest = i.slice(0, -3);
  return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
};
export const showExpr = (expr) => expr.replace(/\d+(\.\d*)?|\.\d+/g, (m) => {
  const [i, d] = m.split('.');
  return d === undefined ? groupInt(i) : `${groupInt(i || '0')}.${d}`;
});
export const showResult = (r) => (isError(r) ? r : showExpr(r.replace('-', '−')));

export function press(state, key) {
  let { expr, result, done } = state;
  const { history } = state;
  const next = (p) => ({ history, expr, result, done, ...p });

  if (key === 'C') return { ...state, expr: '', result: null, done: false };

  if (done) {
    const err = isError(result);
    if (key === '⌫') return next({ expr: err ? '' : result.replace('-', '−'), result: null, done: false });
    if (key === '=') return state;
    if (!err && (isOp(key) || key === '%' || key === '±')) expr = result.replace('-', '−');
    else expr = '';
    result = null;
    done = false;
  }

  if (key === '⌫') return next({ expr: expr.slice(0, -1) });
  if (key === '=') {
    if (!hasMath(expr)) return next();
    const closed = closeAll(trimTail(expr));
    const r = evaluateExpression(toEval(closed));
    if (!Number.isFinite(r)) {
      const msg = /÷\(?0(?![\d.])/.test(closed) ? "Can't divide by 0" : 'Invalid format';
      return next({ expr: closed, result: msg, done: true });
    }
    const res = fmtNum(r);
    return { expr: closed, result: res, done: true, history: [{ expr: closed, result: res }, ...history].slice(0, 50) };
  }

  if (expr.length >= MAX_LEN && key !== '±' && key !== '%') return next();
  const last = expr.slice(-1);

  if (isOp(key)) {
    if (expr === '') return key === '−' ? next({ expr: '−' }) : next();
    if (expr === '−') return next();
    if (last === '(') return key === '−' ? next({ expr: `${expr}−` }) : next();
    if (last === '.') expr = expr.slice(0, -1);
    if (isOp(expr.slice(-1))) {
      const base = expr.slice(0, -1);
      if (base === '' || base.slice(-1) === '(') return next();
      return next({ expr: base + key }); // changed your mind: replace the operator
    }
    return next({ expr: expr + key });
  }

  if (isDigit(key)) {
    if (last === ')') expr += '×';
    if (lastNum(expr) === '0') expr = expr.slice(0, -1);
    return next({ expr: expr + key });
  }

  if (key === '.') {
    if (last === ')') return next({ expr: `${expr}×0.` });
    const n = lastNum(expr);
    if (n) return n.includes('.') ? next() : next({ expr: `${expr}.` });
    return next({ expr: `${expr}0.` });
  }

  if (key === '()') {
    if (openCount(expr) > 0 && (isDigit(last) || last === ')')) return next({ expr: `${expr})` });
    if (isDigit(last) || last === ')' || last === '.') return next({ expr: `${expr}×(` });
    return next({ expr: `${expr}(` });
  }

  if (key === '%') {
    const n = lastNum(expr);
    if (!n) return next();
    const base = expr.slice(0, -n.length);
    let v = parseFloat(n) / 100;
    if (/[+−]$/.test(base)) {
      // Samsung behaviour: 200 + 10%  ->  200 + 20  (10% *of the amount before it*)
      const before = calc(base.slice(0, -1));
      if (Number.isFinite(before)) v = (before * parseFloat(n)) / 100;
    }
    return next({ expr: base + fmtNum(v) });
  }

  if (key === '±') {
    const wrapped = expr.match(/\(−(\d+\.?\d*|\.\d+)\)$/);
    if (wrapped) return next({ expr: expr.slice(0, -wrapped[0].length) + wrapped[1] });
    const n = lastNum(expr);
    if (!n) return next();
    const base = expr.slice(0, -n.length);
    if (base === '−') return next({ expr: n });
    return next({ expr: `${base}(−${n})` });
  }

  return next();
}

// Tapping a history line puts that answer back on the screen.
export const fromHistory = (state, item) => ({ ...state, expr: item.result.replace('-', '−'), result: null, done: false });
