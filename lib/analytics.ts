"use client";
import { track } from "@vercel/analytics/react";
import type { MathConfig } from "@/lib/mathgen";

function send(name: string, props?: Record<string, string | number | boolean | undefined>) {
  try {
    (window as unknown as { clarity?: (...args: unknown[]) => void }).clarity?.("event", name);
  } catch { /* ignore */ }
  track(name, props);
}

const cfgProps = (c: MathConfig) => ({ op: c.op, table: c.table, grade: c.grade, count: c.count });

export const ev = {
  homeStartPractice: (c: MathConfig) => send("home_start_practice", cfgProps(c)),
  homePrint: (c: MathConfig) => send("home_print", cfgProps(c)),
  practiceStarted: (c: MathConfig) => send("practice_started", cfgProps(c)),
  practiceCompleted: (score: number, total: number, seconds: number) => send("practice_completed", { score, total, seconds }),
  printOpened: (c: MathConfig) => send("print_opened", cfgProps(c)),
  ttViewed: (n: number) => send("times_table_viewed", { n }),
  gradePageViewed: (g: number) => send("grade_page_viewed", { g }),
};
