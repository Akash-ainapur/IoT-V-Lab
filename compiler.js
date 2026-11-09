/* Arduino (C++ subset) -> JavaScript generator compiler.
   Every user function becomes a generator so delay() can pause the sketch. */
(function (G) {
'use strict';
const BASE = {int:'int',long:'int',short:'int',word:'int',byte:'int',size_t:'int',uint8_t:'int',uint16_t:'int',uint32_t:'int',int8_t:'int',int16_t:'int',int32_t:'int',
  char:'char',float:'float',double:'float',boolean:'bool',bool:'bool',String:'String',void:'void'};
const QUAL = new Set(['const','static','volatile','unsigned','signed','register','extern','inline']);
const OBJ = {LiquidCrystal_I2C:'newLCD', DHT:'newDHT'};
const CONSTS = {HIGH:[1,'int'],LOW:[0,'int'],INPUT:[0,'int'],OUTPUT:[1,'int'],INPUT_PULLUP:[2,'int'],LED_BUILTIN:[13,'int'],
  PI:[3.14159265,'float'],DEC:[10,'int'],HEX:[16,'int'],OCT:[8,'int'],BIN:[2,'int'],DHT11:[11,'int'],DHT22:[22,'int'],DHT21:[21,'int'],
  SDA:[18,'int'],SCL:[19,'int'],NULL:[0,'int'],true:['true','bool'],false:['false','bool']};
for (let i = 0; i < 8; i++) CONSTS['A' + i] = [14 + i, 'int'];
const FUNCS = {pinMode:'void',digitalWrite:'void',digitalRead:'int',analogRead:'int',analogWrite:'void',analogReference:'void',
  delayMicroseconds:'void',millis:'int',micros:'int',pulseIn:'int',tone:'void',noTone:'void',map:'int',constrain:'same',abs:'same',
  min:'same',max:'same',random:'int',randomSeed:'void',sqrt:'float',pow:'float',sin:'float',cos:'float',tan:'float',floor:'int',
  ceil:'int',round:'int',sq:'same',radians:'float',degrees:'float',lowByte:'int',highByte:'int',bitRead:'int',isDigit:'bool',isAlpha:'bool',
  attachInterrupt:'void',digitalPinToInterrupt:'int',interrupts:'void',noInterrupts:'void'};
const MRET = {available:'int',read:'int',peek:'int',parseInt:'int',parseFloat:'float',readString:'String',readStringUntil:'String',
  readHumidity:'float',readTemperature:'float',readHeatIndex:'float'};
const SMRET = {length:'int',toInt:'int',toFloat:'float',equals:'bool',indexOf:'int',substring:'String',trim:'void',toUpperCase:'void',
  toLowerCase:'void',startsWith:'bool',endsWith:'bool',charAt:'char',concat:'bool',equalsIgnoreCase:'bool'};
const PREC = {'||':1,'&&':2,'|':3,'^':4,'&':5,'==':6,'!=':6,'<':7,'>':7,'<=':7,'>=':7,'<<':8,'>>':8,'+':9,'-':9,'*':10,'/':10,'%':10};
const ASSIGN = new Set(['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=']);
const OPS3 = ['<<=','>>='];
const OPS2 = ['++','--','+=','-=','*=','/=','%=','&=','|=','^=','==','!=','<=','>=','&&','||','<<','>>','->','::'];
const NUM_RE = /0[xX][0-9a-fA-F]+[uUlL]*|0[bB][01]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFuUlL]*/y;

function tokenize(src, startLine) {
  const toks = []; let i = 0, line = startLine || 1; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '#') { let j = i; while (j < n && src[j] !== '\n') j++; toks.push({t:'pp', v:src.slice(i, j), line}); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++; toks.push({t:'id', v:src.slice(i, j), line}); i = j; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      NUM_RE.lastIndex = i; const m = NUM_RE.exec(src);
      if (!m) throw {msg:'bad number', line};
      const s = m[0]; let v, f = false;
      if (/^0[xX]/.test(s)) v = parseInt(s.replace(/[uUlL]+$/, ''), 16);
      else if (/^0[bB]/.test(s)) v = parseInt(s.slice(2), 2);
      else { f = /[.eE]/.test(s) || /[fF]$/.test(s); v = parseFloat(s); }
      toks.push({t:'num', v, f, line}); i += s.length; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\\') { j++; const e = src[j]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === '0' ? '\0' : e; }
        else if (src[j] === '\n') throw {msg:'missing terminating " character', line};
        else s += src[j];
        j++;
      }
      toks.push({t:'str', v:s, line}); i = j + 1; continue;
    }
    if (c === "'") {
      let j = i + 1, v;
      if (src[j] === '\\') { j++; const e = src[j]; v = e === 'n' ? 10 : e === 't' ? 9 : e === 'r' ? 13 : e === '0' ? 0 : e.charCodeAt(0); }
      else v = src.charCodeAt(j);
      j++; if (src[j] !== "'") throw {msg:'missing terminating \' character', line};
      toks.push({t:'chr', v, line}); i = j + 1; continue;
    }
    const s3 = src.substr(i, 3), s2 = src.substr(i, 2);
    if (OPS3.includes(s3)) { toks.push({t:'op', v:s3, line}); i += 3; continue; }
    if (OPS2.includes(s2)) { toks.push({t:'op', v:s2, line}); i += 2; continue; }
    if ('+-*/%=<>!~&|^?:,;.()[]{}'.includes(c)) { toks.push({t:'op', v:c, line}); i++; continue; }
    throw {msg:`stray '${c}' in program`, line};
  }
  return toks;
}

function preprocess(src) {
  const raw = tokenize(src); const macros = {}; const toks = [];
  for (const k of raw) {
    if (k.t === 'pp') {
      const m = /^#\s*define\s+([A-Za-z_]\w*)\s*(.*)$/.exec(k.v);
      if (m) macros[m[1]] = tokenize(m[2], k.line);
      continue;
    }
    toks.push(k);
  }
  let out = toks;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false; const nx = [];
    for (const k of out) {
      if (k.t === 'id' && macros[k.v]) {
        const rep = macros[k.v].map(x => Object.assign({}, x, {line:k.line}));
        changed = true;
        if (rep.length > 1) { nx.push({t:'op', v:'(', line:k.line}, ...rep, {t:'op', v:')', line:k.line}); } else nx.push(...rep);
      } else nx.push(k);
    }
    out = nx; if (!changed) break;
  }
  return out;
}

function isI(t) { return t === 'int' || t === 'char' || t === 'bool'; }
function numT(a, b) { return a.t === 'float' || b.t === 'float' ? 'float' : (a.t === 'unk' || b.t === 'unk' ? 'unk' : 'int'); }
function toS(x) {
  switch (x.t) {
    case 'String': return x.c;
    case 'char': return `String.fromCharCode(${x.c})`;
    case 'bool': return `String(+${x.c})`;
    case 'int': return `String(${x.c})`;
    default: return `$fmt(${x.c},${JSON.stringify(x.t)})`;
  }
}
function coerce(c, from, to) {
  switch (to) {
    case 'int': return from === 'int' || from === 'char' ? c : `$i(${c})`;
    case 'char': return `($i(${c})&255)`;
    case 'float': return from === 'bool' ? `(+${c})` : c;
    case 'bool': return `!!(${c})`;
    case 'String': return from === 'char' ? `String.fromCharCode(${c})` : (from === 'String' ? c : `$fmt(${c},${JSON.stringify(from)})`);
    default: return c;
  }
}

class Parser {
  constructor(toks) { this.t = toks; this.p = 0; this.scopes = [new Map()]; this.funcs = new Map(); this.defined = new Set(); this.gnames = []; this.init = []; this.curRet = 'void'; }
  get cur() { return this.t[this.p]; }
  err(msg, tok) { const k = tok || this.cur || this.t[this.t.length - 1]; throw {msg, line:k ? k.line : 0}; }
  isOp(v) { const k = this.cur; return !!k && k.t === 'op' && k.v === v; }
  isId(v) { const k = this.cur; return !!k && k.t === 'id' && k.v === v; }
  eatOp(v) { if (this.isOp(v)) { this.p++; return true; } return false; }
  needOp(v) { if (!this.eatOp(v)) this.err(`expected '${v}' before '${this.cur ? this.cur.v : 'end of file'}'`, this.cur || this.t[this.p - 1]); }
  needId() { const k = this.cur; if (!k || k.t !== 'id') this.err('expected identifier'); this.p++; return k.v; }
  lookup(n) { for (let i = this.scopes.length - 1; i >= 0; i--) { const v = this.scopes[i].get(n); if (v) return v; } return null; }
  declare(n, info) { this.scopes[this.scopes.length - 1].set(n, info); }

  typeSpec(i) {
    let saw = false, t = null, cls = null, j = i, baseSeen = false;
    for (;;) {
      const k = this.t[j]; if (!k || k.t !== 'id') break;
      const v = k.v;
      if (QUAL.has(v)) { if (v === 'unsigned' || v === 'signed') { if (!t) t = 'int'; } saw = true; j++; continue; }
      if (BASE[v]) { if (baseSeen && !(v === 'long' || v === 'int' || v === 'short')) break; t = BASE[v]; baseSeen = true; saw = true; j++; continue; }
      if (OBJ[v] && !saw) { cls = v; saw = true; j++; }
      break;
    }
    if (!saw) return null;
    if (!baseSeen && !cls && !t) return null; // only 'const' etc.
    return {t:t || 'int', cls, end:j};
  }

  prescan() {
    let depth = 0;
    for (let i = 0; i < this.t.length; i++) {
      const k = this.t[i];
      if (k.t === 'op') { if (k.v === '{') depth++; else if (k.v === '}') depth--; continue; }
      if (depth !== 0 || k.t !== 'id') continue;
      const ts = this.typeSpec(i); if (!ts || ts.cls) continue;
      const n = this.t[ts.end], o = this.t[ts.end + 1];
      if (n && n.t === 'id' && o && o.t === 'op' && o.v === '(') { this.funcs.set(n.v, {ret:ts.t}); i = ts.end + 1; }
      else i = Math.max(i, ts.end - 1);
    }
  }

  program() {
    this.prescan(); const fn = [];
    while (this.cur) {
      if (this.eatOp(';')) continue;
      const ts = this.typeSpec(this.p);
      if (!ts) this.err(`'${this.cur.v}' does not name a type`);
      const a = this.t[ts.end], b = this.t[ts.end + 1];
      if (!ts.cls && a && a.t === 'id' && b && b.t === 'op' && b.v === '(') fn.push(this.funcDef(ts));
      else { this.p = ts.end; this.declList(ts, true); this.needOp(';'); }
    }
    for (const need of ['setup', 'loop']) if (!this.defined.has(need)) throw {msg:`undefined reference to \`${need}'`, line:0};
    return `let ${['$dummy'].concat(this.gnames).join(',')};\nfunction* $init(){${this.init.join('\n')}}\n${fn.join('\n')}\nreturn {init:$init,setup:_setup,loop:_loop};`;
  }

  funcDef(ts) {
    this.p = ts.end; const name = this.needId(); this.needOp('(');
    const params = []; this.scopes.push(new Map());
    if (!this.eatOp(')')) {
      do {
        if (this.isId('void') && this.t[this.p + 1] && this.t[this.p + 1].v === ')') { this.p++; continue; }
        const pts = this.typeSpec(this.p); if (!pts) this.err('expected parameter type');
        this.p = pts.end; this.eatOp('&'); const pn = this.needId(); let arr = false;
        if (this.eatOp('[')) { this.eatOp(']'); arr = true; }
        if (this.eatOp('=')) this.parseAssign();
        this.declare(pn, {t:pts.t, arr, js:'_' + pn}); params.push({n:pn, t:pts.t, arr});
      } while (this.eatOp(','));
      this.needOp(')');
    }
    if (this.eatOp(';')) { this.scopes.pop(); return ''; }
    this.defined.add(name);
    const prev = this.curRet; this.curRet = ts.t;
    const body = this.block(); this.curRet = prev; this.scopes.pop();
    const pre = params.filter(p => !p.arr && p.t !== 'String' && p.t !== 'float').map(p => `_${p.n}=${coerce('_' + p.n, 'unk', p.t)};`).join('');
    return `function* _${name}(${params.map(p => '_' + p.n).join(',')}){${pre}${body}}`;
  }

  block() {
    this.needOp('{'); let out = '';
    while (!this.isOp('}')) { if (!this.cur) this.err("expected '}' at end of input", this.t[this.t.length - 1]); out += this.stmt() + '\n'; }
    this.p++; return out;
  }

  declList(ts, global) {
    const parts = [];
    do {
      while (this.eatOp('*')) {}
      const name = this.needId(), js = '_' + name; let arr = false, size = null;
      if (this.eatOp('[')) { arr = true; if (!this.isOp(']')) size = this.parseAssign(); this.needOp(']'); }
      let init = null;
      if (ts.cls) {
        const args = [];
        if (this.eatOp('(')) { if (!this.eatOp(')')) { do { args.push(this.parseAssign().c); } while (this.eatOp(',')); this.needOp(')'); } }
        this.declare(name, {t:'obj', js}); init = `$rt.${OBJ[ts.cls]}(${args.join(',')})`;
      } else {
        this.declare(name, {t:ts.t, arr, js});
        const def = ts.t === 'String' ? '""' : (ts.t === 'bool' ? 'false' : '0');
        if (this.eatOp('=')) {
          if (this.isOp('{')) {
            this.p++; const items = [];
            while (!this.isOp('}')) { const e = this.parseAssign(); items.push(coerce(e.c, e.t, ts.t)); if (!this.eatOp(',')) break; }
            this.needOp('}'); init = `[${items.join(',')}]`;
            if (size) init = `$pad(${init},${size.c},${def})`;
          } else { const e = this.parseAssign(); init = arr ? e.c : coerce(e.c, e.t, ts.t); }
        } else if (arr) init = size ? `new Array(${size.c}).fill(${def})` : '[]';
        else init = def;
      }
      if (global) { this.gnames.push(js); this.init.push(`${js}=${init};`); } else parts.push(`${js}=${init}`);
    } while (this.eatOp(','));
    return parts.length ? 'let ' + parts.join(',') : '';
  }

  tick() { return 'if((++$s&255)===0)yield 0;'; }

  stmt() {
    const k = this.cur; if (!k) this.err('unexpected end of file');
    if (k.t === 'op') {
      if (k.v === '{') { this.scopes.push(new Map()); const b = this.block(); this.scopes.pop(); return `{${b}}`; }
      if (k.v === ';') { this.p++; return ''; }
    }
    if (k.t === 'id') {
      switch (k.v) {
        case 'if': {
          this.p++; this.needOp('('); const c = this.parseExpr(); this.needOp(')');
          const a = this.sub(); let e = '';
          if (this.isId('else')) { this.p++; e = `else{${this.sub()}}`; }
          return `if(${c.c}){${a}}${e}`;
        }
        case 'while': { this.p++; this.needOp('('); const c = this.parseExpr(); this.needOp(')'); const b = this.sub(); return `while(${c.c}){${this.tick()}${b}}`; }
        case 'do': {
          this.p++; const b = this.sub(); if (!this.isId('while')) this.err("expected 'while'"); this.p++;
          this.needOp('('); const c = this.parseExpr(); this.needOp(')'); this.needOp(';'); return `do{${this.tick()}${b}}while(${c.c});`;
        }
        case 'for': {
          this.p++; this.needOp('('); this.scopes.push(new Map());
          let init = '';
          if (!this.isOp(';')) {
            const ts = this.typeSpec(this.p);
            if (ts && !ts.cls) { this.p = ts.end; init = this.declList(ts, false); } else init = this.parseExpr().c;
          }
          this.needOp(';'); const cond = this.isOp(';') ? '' : this.parseExpr().c; this.needOp(';');
          const inc = this.isOp(')') ? '' : this.parseExpr().c; this.needOp(')');
          const b = this.sub(); this.scopes.pop();
          return `for(${init};${cond};${inc}){${this.tick()}${b}}`;
        }
        case 'switch': {
          this.p++; this.needOp('('); const c = this.parseExpr(); this.needOp(')'); this.needOp('{'); this.scopes.push(new Map()); let out = `switch(${c.c}){`;
          while (!this.isOp('}')) {
            if (!this.cur) this.err("expected '}'");
            if (this.isId('case')) { this.p++; const e = this.ternary(); this.needOp(':'); out += `case ${e.c}:`; }
            else if (this.isId('default')) { this.p++; this.needOp(':'); out += 'default:'; }
            else out += this.stmt();
          }
          this.p++; this.scopes.pop(); return out + '}';
        }
        case 'break': case 'continue': this.p++; this.needOp(';'); return k.v + ';';
        case 'return': {
          this.p++; if (this.eatOp(';')) return 'return;';
          const e = this.parseExpr(); this.needOp(';'); return `return ${coerce(e.c, e.t, this.curRet)};`;
        }
      }
      const ts = this.typeSpec(this.p);
      if (ts) {
        const nx = this.t[ts.end];
        if (nx && (nx.t === 'id' || (nx.t === 'op' && nx.v === '*'))) {
          this.p = ts.end; const d = this.declList(ts, false); this.needOp(';'); return d + ';';
        }
      }
    }
    const e = this.parseExpr(); this.needOp(';'); return e.c + ';';
  }
  sub() { if (this.isOp('{')) { this.scopes.push(new Map()); const b = this.block(); this.scopes.pop(); return b; } this.scopes.push(new Map()); const s = this.stmt(); this.scopes.pop(); return s; }

  parseExpr() { let e = this.parseAssign(); while (this.isOp(',')) { this.p++; const r = this.parseAssign(); e = {c:`(${e.c},${r.c})`, t:r.t}; } return e; }
  parseAssign() {
    const l = this.ternary(); const k = this.cur;
    if (k && k.t === 'op' && ASSIGN.has(k.v)) {
      if (!l.lv) this.err('lvalue required as left operand of assignment');
      this.p++; const r = this.parseAssign(); let val;
      if (k.v === '=') val = coerce(r.c, r.t, l.t);
      else { const b = this.binop(k.v.slice(0, -1), {c:l.c, t:l.t}, r); val = coerce(b.c, b.t, l.t); }
      return {c:`(${l.c}=${val})`, t:l.t};
    }
    return l;
  }
  ternary() {
    const c = this.bin(1);
    if (this.eatOp('?')) { const a = this.parseAssign(); this.needOp(':'); const b = this.parseAssign(); return {c:`(${c.c}?${a.c}:${b.c})`, t:(a.t === 'float' || b.t === 'float') ? 'float' : a.t}; }
    return c;
  }
  bin(min) {
    let l = this.unary();
    for (;;) {
      const k = this.cur; if (!k || k.t !== 'op') break;
      const pr = PREC[k.v]; if (!pr || pr < min) break;
      this.p++; const r = this.bin(pr + 1); l = this.binop(k.v, l, r);
    }
    return l;
  }
  binop(op, l, r) {
    switch (op) {
      case '+': if (l.t === 'String' || r.t === 'String') return {c:`(${toS(l)}+${toS(r)})`, t:'String'}; return {c:`(${l.c}+${r.c})`, t:numT(l, r)};
      case '-': case '*': return {c:`(${l.c}${op}${r.c})`, t:numT(l, r)};
      case '/': return isI(l.t) && isI(r.t) ? {c:`$idiv(${l.c},${r.c})`, t:'int'} : {c:`(${l.c}/${r.c})`, t:numT(l, r)};
      case '%': return {c:`(${l.c}%${r.c})`, t:'int'};
      case '==': case '!=': case '<': case '>': case '<=': case '>=': case '&&': case '||': return {c:`(${l.c}${op}${r.c})`, t:'bool'};
      default: return {c:`(${l.c}${op}${r.c})`, t:'int'};
    }
  }
  unary() {
    const k = this.cur; if (!k) this.err('unexpected end of file');
    if (k.t === 'op') {
      if (k.v === '!') { this.p++; const e = this.unary(); return {c:`(!${e.c})`, t:'bool'}; }
      if (k.v === '-') { this.p++; const e = this.unary(); return {c:`(-${e.c})`, t:(e.t === 'char' || e.t === 'bool') ? 'int' : e.t}; }
      if (k.v === '+') { this.p++; return this.unary(); }
      if (k.v === '~') { this.p++; const e = this.unary(); return {c:`(~${e.c})`, t:'int'}; }
      if (k.v === '++' || k.v === '--') { this.p++; const e = this.unary(); return {c:`(${k.v}${e.c})`, t:e.t}; }
      if (k.v === '(') {
        const ts = this.typeSpec(this.p + 1);
        if (ts && !ts.cls) { const nx = this.t[ts.end]; if (nx && nx.t === 'op' && nx.v === ')') { this.p = ts.end + 1; const e = this.unary(); return {c:coerce(e.c, e.t, ts.t), t:ts.t}; } }
      }
      if (k.v === '&' || k.v === '*') { this.p++; return this.unary(); }
    }
    return this.postfix();
  }
  postfix() {
    let e = this.primary();
    for (;;) {
      if (this.isOp('[')) { this.p++; const i = this.parseExpr(); this.needOp(']'); e = {c:`${e.c}[${i.c}]`, t:e.t, lv:true}; }
      else if (this.isOp('.')) { this.p++; const m = this.needId(); if (!this.isOp('(')) this.err(`'${m}': only method calls are supported`); e = this.method(e, m); }
      else if (this.isOp('++') || this.isOp('--')) { const o = this.cur.v; this.p++; e = {c:`(${e.c}${o})`, t:e.t}; }
      else break;
    }
    return e;
  }
  args() {
    const a = []; this.needOp('(');
    if (!this.eatOp(')')) { do { a.push(this.parseAssign()); } while (this.eatOp(',')); this.needOp(')'); }
    return a;
  }
  method(obj, m) {
    const args = this.args();
    if (obj.t === 'String') return {c:`$sm(${obj.c},${JSON.stringify(m)}${args.map(a => ',' + a.c).join('')})`, t:SMRET[m] || 'unk'};
    if (obj.t !== 'obj') this.err(`request for member '${m}' in something not a class`);
    if (m === 'print' || m === 'println') {
      const a0 = args[0];
      const s = a0 ? `$fmt(${a0.c},${JSON.stringify(a0.t)}${args[1] ? ',' + args[1].c : ''})` : '""';
      const call = `${obj.c}.${m}(${s})`;
      return obj.c === 'Serial' ? {c:`(${call},Serial.full()&&(yield* $txwait()),0)`, t:'void'} : {c:call, t:'void'};
    }
    if (m === 'write' && obj.c === 'Serial') return {c:`(Serial.write(${args[0] ? args[0].c : 0}),Serial.full()&&(yield* $txwait()),0)`, t:'void'};
    return {c:`${obj.c}.${m}(${args.map(a => a.c).join(',')})`, t:MRET[m] || 'unk'};
  }
  primary() {
    const k = this.cur; if (!k) this.err('unexpected end of file');
    this.p++;
    if (k.t === 'num') return {c:String(k.v), t:k.f ? 'float' : 'int'};
    if (k.t === 'str') return {c:JSON.stringify(k.v), t:'String'};
    if (k.t === 'chr') return {c:String(k.v), t:'char'};
    if (k.t === 'op' && k.v === '(') { const e = this.parseExpr(); this.needOp(')'); return {c:`(${e.c})`, t:e.t}; }
    if (k.t === 'id') {
      const n = k.v; const info = this.lookup(n);
      const nextCall = this.isOp('(');
      if (!info) {
        if (CONSTS[n]) return {c:String(CONSTS[n][0]), t:CONSTS[n][1]};
        if (n === 'Serial') return {c:'Serial', t:'obj'};
        if (n === 'F' && nextCall) { const a = this.args(); return a[0]; }
        if (n === 'String' && nextCall) { const a = this.args(); return {c:a[0] ? coerce(a[0].c, a[0].t, 'String') : '""', t:'String'}; }
        if (BASE[n] && nextCall) { const a = this.args(); return {c:coerce(a[0].c, a[0].t, BASE[n]), t:BASE[n]}; }
        if (nextCall) {
          const a = this.args();
          if (n === 'delay') return {c:`(yield* $delay(${a[0] ? a[0].c : 0}))`, t:'void'};
          if (this.funcs.has(n)) return {c:`(yield* _${n}(${a.map(x => x.c).join(',')}))`, t:this.funcs.get(n).ret};
          if (FUNCS[n]) {
            let t = FUNCS[n];
            if (t === 'same') t = a.some(x => x.t === 'float') ? 'float' : 'int';
            return {c:`$${n}(${a.map(x => x.c).join(',')})`, t};
          }
        }
        this.err(`'${n}' was not declared in this scope`, k);
      }
      return {c:info.js, t:info.t, lv:true};
    }
    this.err(`expected expression before '${k.v}'`, k);
  }
}

function compile(src) {
  try {
    const toks = preprocess(src);
    const p = new Parser(toks);
    const body = p.program();
    const pre = `const Serial=$rt.Serial,$delay=$rt.delay,$fmt=$rt.fmt,$i=$rt.toInt,$idiv=$rt.idiv,$sm=$rt.sm,$txwait=$rt.txwait,$pad=$rt.pad;`
      + Object.keys(FUNCS).map(n => `const $${n}=$rt.${n};`).join('') + 'let $s=0;\n';
    const code = pre + body;
    const factory = new Function('$rt', code);
    const bytes = 1100 + toks.length * 7;
    return {ok:true, factory, code, bytes, vars:p.gnames.length * 2 + 9};
  } catch (e) {
    if (e && e.msg !== undefined) return {ok:false, msg:e.msg, line:e.line};
    return {ok:false, msg:String(e && e.message || e), line:0};
  }
}

G.ArduinoCompiler = {compile};
if (typeof module !== 'undefined') module.exports = G.ArduinoCompiler;
})(typeof window !== 'undefined' ? window : globalThis);
