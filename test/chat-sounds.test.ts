import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_COOLDOWN_TICKS,
  DEFAULT_RULES,
  isCreativeExempt,
  isOnCooldown,
  matchRule,
  nextExpireTick,
  resolveConfig,
} from "../sapi/src/sounds-util.ts";

describe("chat-sounds resolveConfig", () => {
  it("缺省回退内置预设与 200 ticks", () => {
    const cfg = resolveConfig(undefined);
    assert.equal(cfg.cooldownTicks, DEFAULT_COOLDOWN_TICKS);
    assert.deepEqual(cfg.rules, DEFAULT_RULES);
  });

  it("解析合法 rules / cooldown_ticks", () => {
    const cfg = resolveConfig({
      cooldown_ticks: 100,
      rules: [{ keyword: "yee", sound: "random.click", volume: 0.5, pitch: 2 }],
    });
    assert.equal(cfg.cooldownTicks, 100);
    assert.equal(cfg.rules.length, 1);
    assert.equal(cfg.rules[0]?.keyword, "yee");
    assert.equal(cfg.rules[0]?.volume, 0.5);
  });

  it("空 rules 回退默认词表", () => {
    const cfg = resolveConfig({ cooldown_ticks: 50, rules: [] });
    assert.equal(cfg.cooldownTicks, 50);
    assert.equal(cfg.rules.length, DEFAULT_RULES.length);
  });
});

describe("chat-sounds matchRule", () => {
  const rules = DEFAULT_RULES;

  it("子串大小写不敏感命中", () => {
    assert.equal(matchRule("Hello Ciallo~", rules)?.sound, "random.levelup");
    assert.equal(matchRule("BAKA!", rules)?.sound, "mob.villager.no");
  });

  it("未命中返回 undefined", () => {
    assert.equal(matchRule("hello world", rules), undefined);
  });

  it("首条命中优先", () => {
    const multi = [
      { keyword: "ab", sound: "a", volume: 1, pitch: 1 },
      { keyword: "abc", sound: "b", volume: 1, pitch: 1 },
    ];
    assert.equal(matchRule("abc", multi)?.sound, "a");
  });
});

describe("chat-sounds cooldown", () => {
  it("创造豁免", () => {
    assert.equal(isCreativeExempt("Creative"), true);
    assert.equal(isCreativeExempt("Survival"), false);
    assert.equal(isCreativeExempt("Adventure"), false);
  });

  it("冷却窗口判定", () => {
    assert.equal(isOnCooldown(100, undefined), false);
    assert.equal(isOnCooldown(100, 200), true);
    assert.equal(isOnCooldown(200, 200), false);
    assert.equal(isOnCooldown(201, 200), false);
  });

  it("nextExpireTick", () => {
    assert.equal(nextExpireTick(10, 200), 210);
    assert.equal(nextExpireTick(10, 0), 10);
  });
});
