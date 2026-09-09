/**
 * @sfmc-bds/module-chat-sounds — 聊天关键字全服音效
 *
 * 经 chat.onMessage 观察者插槽接入；禁止裸听原生 chatSend。
 */

import { GameMode, system, world, type Player } from "@minecraft/server";
import {
  ModuleRegistry,
  type ModuleServices,
} from "@sfmc-bds/sdk/module-loader";
import { config } from "@sfmc-bds/sdk/sapi/config";
import { service } from "@sfmc-bds/sdk/sapi/service";
import { debug } from "@sfmc-bds/sdk/sapi/runtime";
import {
  isCreativeExempt,
  isOnCooldown,
  matchRule,
  nextExpireTick,
  resolveConfig,
  type ChatSoundsConfig,
  type SoundRule,
} from "./sounds-util.js";

const MODULE_ID = "chat-sounds";
const OBSERVER_ID = "chat-sounds.keywords";

/** 玩家 id → 冷却到期刻 */
const cooldownUntil = new Map<string, number>();

let runtimeConfig: ChatSoundsConfig = resolveConfig(undefined);
let observerRegistered = false;

function playSoundForAll(rule: SoundRule): void {
  system.run(() => {
    for (const p of world.getAllPlayers()) {
      try {
        p.playSound(rule.sound, { volume: rule.volume, pitch: rule.pitch });
      } catch {
        /* 个别玩家播音失败不阻断 */
      }
    }
  });
}

function handleChatMessage(ctx: { player: Player; message: string }): void {
  const rule = matchRule(ctx.message, runtimeConfig.rules);
  if (!rule) return;

  const player = ctx.player;
  let gameMode: string;
  try {
    gameMode = player.getGameMode();
  } catch {
    gameMode = GameMode.Survival;
  }

  if (!isCreativeExempt(gameMode)) {
    const now = system.currentTick;
    const expire = cooldownUntil.get(player.id);
    if (isOnCooldown(now, expire)) {
      // 冷却中：仅放行聊天文本，不触发全服音效
      return;
    }
    cooldownUntil.set(
      player.id,
      nextExpireTick(now, runtimeConfig.cooldownTicks),
    );
  }

  playSoundForAll(rule);
}

async function loadConfig(services?: ModuleServices): Promise<void> {
  const cfg = services?.config ?? config;
  try {
    const all = (await cfg.getAll()) as Record<string, unknown>;
    runtimeConfig = resolveConfig(all);
    debug.i(
      "ChatSounds",
      `config cooldown=${runtimeConfig.cooldownTicks} rules=${runtimeConfig.rules.length}`,
    );
  } catch (err) {
    runtimeConfig = resolveConfig(undefined);
    debug.w(
      "ChatSounds",
      `配置读取失败，已回退内置预设: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function registerObserver(services?: ModuleServices): Promise<void> {
  if (observerRegistered) return;
  const svc = services?.service ?? service;
  try {
    const result = (await svc.call("chat.onMessage", {
      id: OBSERVER_ID,
      handler: (ctx: { player: Player; message: string }) => {
        handleChatMessage(ctx);
      },
    } as unknown as Record<string, unknown>)) as { ok?: boolean } | undefined;
    if (result && result.ok === false) {
      throw new Error("chat.onMessage 返回 ok=false");
    }
    observerRegistered = true;
    debug.i("ChatSounds", "已挂接 chat.onMessage 观察者");
  } catch (err) {
    debug.w(
      "ChatSounds",
      `chat.onMessage 注册失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

ModuleRegistry.register({
  id: MODULE_ID,
  afterWorldLoad: false,
  lifecycle: {
    registerPermissions() {
      // 无独立命令面
    },
    registerEvents(services) {
      // 规格要求：在 registerEvents 挂接 chat.onMessage（严禁裸听 chatSend）
      void registerObserver(services);
    },
    async init(services) {
      await loadConfig(services);
      // 若 chat 尚未 provide（启动序），init 再补一次注册
      if (!observerRegistered) {
        await registerObserver(services);
      }
      debug.i("ChatSounds", "init ready");
    },
    cleanup() {
      cooldownUntil.clear();
      observerRegistered = false;
      runtimeConfig = resolveConfig(undefined);
      debug.i("ChatSounds", "cleanup");
    },
  },
});
