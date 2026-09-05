/**
 * 聊天关键字音效：配置解析、匹配与冷却判定（纯函数，便于单测）。
 */

/** 单条关键词 → 音效规则 */
export interface SoundRule {
  keyword: string;
  sound: string;
  volume: number;
  pitch: number;
}

/** 模块运行时配置 */
export interface ChatSoundsConfig {
  cooldownTicks: number;
  rules: SoundRule[];
}

/** 设计规格内置预设（配置缺失时回退） */
export const DEFAULT_COOLDOWN_TICKS = 200;

export const DEFAULT_RULES: SoundRule[] = [
  { keyword: "ciallo", sound: "random.levelup", volume: 1.0, pitch: 1.0 },
  { keyword: "baka", sound: "mob.villager.no", volume: 1.0, pitch: 1.2 },
];

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeRule(raw: unknown): SoundRule | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const keyword = typeof o.keyword === "string" ? o.keyword.trim() : "";
  const sound = typeof o.sound === "string" ? o.sound.trim() : "";
  if (!keyword || !sound) return undefined;
  return {
    keyword,
    sound,
    volume: asFiniteNumber(o.volume, 1.0),
    pitch: asFiniteNumber(o.pitch, 1.0),
  };
}

/**
 * 从 config 桶解析运行时配置；损坏或缺省字段时回退内置预设。
 */
export function resolveConfig(raw: Record<string, unknown> | null | undefined): ChatSoundsConfig {
  const src = raw ?? {};
  const cooldownTicks = asFiniteNumber(src.cooldown_ticks, DEFAULT_COOLDOWN_TICKS);
  const rulesRaw = Array.isArray(src.rules) ? src.rules : undefined;
  const rules: SoundRule[] = [];
  if (rulesRaw) {
    for (const item of rulesRaw) {
      const rule = normalizeRule(item);
      if (rule) rules.push(rule);
    }
  }
  return {
    cooldownTicks: cooldownTicks > 0 ? cooldownTicks : DEFAULT_COOLDOWN_TICKS,
    rules: rules.length > 0 ? rules : [...DEFAULT_RULES],
  };
}

/**
 * 子串匹配（大小写不敏感）；返回首条命中规则。
 */
export function matchRule(message: string, rules: SoundRule[]): SoundRule | undefined {
  if (!message || rules.length === 0) return undefined;
  const lower = message.toLowerCase();
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) return rule;
  }
  return undefined;
}

/** 创造模式豁免冷却 */
export function isCreativeExempt(gameMode: string): boolean {
  return gameMode === "Creative";
}

/** 当前刻是否仍处于冷却（expireTick 为冷却结束刻，含边界） */
export function isOnCooldown(nowTick: number, expireTick: number | undefined): boolean {
  if (expireTick === undefined) return false;
  return nowTick < expireTick;
}

/** 计算冷却到期刻 */
export function nextExpireTick(nowTick: number, cooldownTicks: number): number {
  return nowTick + Math.max(0, cooldownTicks);
}
