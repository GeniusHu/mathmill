// MathMill 题目生成核心：URL 编码配置 + 题目生成器（免数据库架构）

export interface MathConfig {
  op: "mul" | "div" | "add" | "sub";
  table?: number;
  grade?: number;
  count?: number;
}

export const MAX_PROBLEMS = 100;

export function encodeConfig(cfg: MathConfig): string {
  const slim = { o: cfg.op, t: cfg.table ?? 0, g: cfg.grade ?? 0, c: cfg.count ?? 20 };
  const json = JSON.stringify(slim);
  const b64 = typeof window === "undefined"
    ? Buffer.from(json, "utf8").toString("base64url")
    : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(b64: string): MathConfig | null {
  try {
    const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window === "undefined"
      ? Buffer.from(norm, "base64").toString("utf8")
      : decodeURIComponent(escape(atob(norm)));
    const o = JSON.parse(json);
    if (!["mul", "div", "add", "sub"].includes(o.o)) return null;
    return {
      op: o.o,
      table: Number(o.t) || 0,
      grade: Number(o.g) || 0,
      count: Math.min(MAX_PROBLEMS, Math.max(5, Number(o.c) || 20)),
    };
  } catch {
    return null;
  }
}

function gradeRange(grade: number): [number, number] {
  switch (grade) {
    case 2: return [1, 10];
    case 3: return [2, 12];
    case 4: return [2, 99];
    case 5: return [3, 999];
    default: return [1, 12];
  }
}

export interface Problem {
  a: number;
  b: number;
  answer: number;
  display: string;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 洗牌（Fisher-Yates，用同一 rnd 保持确定性） */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成题目：先穷尽组合池再循环（flashcard 标准做法）。
 * 同一配置的组合顺序确定性（同 URL 同卷面），但每轮内部洗牌，
 * 保证同一种组合在两轮之间不会相邻重复。
 */
export function generateProblems(cfg: MathConfig, seed = 42): Problem[] {
  const rnd = mulberry32(seed);
  const [min, max] = gradeRange(cfg.grade || 0);
  const count = cfg.count || 20;
  const table = cfg.table || 0;

  // 1. 构建组合池（a,b 对；对乘除法是整数对，加减法直接是题目）
  interface Pair { a: number; b: number }
  let pool: Pair[] = [];
  const symOf: Record<MathConfig["op"], string> = { mul: "×", div: "÷", add: "+", sub: "−" };

  if (cfg.op === "mul" && table) {
    // 指定表：固定 12 种
    pool = Array.from({ length: 12 }, (_, i) => ({ a: table, b: i + 1 }));
  } else if (cfg.op === "mul") {
    const hi = Math.min(max, 12);
    for (let a = min; a <= hi; a++) for (let b = min; b <= hi; b++) pool.push({ a, b });
  } else if (cfg.op === "div") {
    // 除法池：商×除数=被除数，限制积的范围避免题面过大
    const hi = table ? 12 : Math.min(max, 12);
    for (let a = 1; a <= hi; a++) for (let b = 1; b <= 12; b++) pool.push({ a, b });
    if (table) pool = pool.filter((p) => p.b === table || p.a === table);
  } else {
    // 加减法：池 = 范围内抽样组合（数量足够，直接洗牌循环）
    const space = (max - min + 1) * (max - min + 1);
    const need = Math.min(count, Math.max(space, count));
    for (let i = 0; i < need; i++) {
      const a = Math.floor(rnd() * (max - min + 1)) + min;
      const b = Math.floor(rnd() * (max - min + 1)) + min;
      pool.push({ a, b });
    }
  }

  // 2. 洗牌循环取够 count 道
  const problems: Problem[] = [];
  let deck: Pair[] = [];
  while (problems.length < count) {
    if (deck.length === 0) deck = shuffle(pool, rnd);
    const p = deck.pop()!;
    let a = p.a, b = p.b, ans: number;
    switch (cfg.op) {
      case "mul": ans = a * b; break;
      case "div": ans = a; a = p.a * p.b; b = p.b; ans = p.a; break; // 商=p.a, 除数=p.b
      case "add": ans = a + b; break;
      default: ans = a - b; if (b > a) { [a, b] = [b, a]; ans = a - b; } break;
    }
    problems.push({ a, b, answer: ans, display: `${a} ${symOf[cfg.op]} ${b} =` });
  }
  return problems;
}

export const OP_LABEL: Record<MathConfig["op"], string> = {
  mul: "Multiplication",
  div: "Division",
  add: "Addition",
  sub: "Subtraction",
};

export const GRADE_LABEL: Record<number, string> = {
  2: "2nd Grade",
  3: "3rd Grade",
  4: "4th Grade",
  5: "5th Grade",
};
