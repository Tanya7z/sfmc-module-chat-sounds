# @sfmc-bds/module-chat-sounds

Wave C official SFMC module: **chat-sounds**（聊天关键字全服音效）.

经 `chat.onMessage` 观察者插槽匹配关键词并向全服播发音效；生存模式默认 200 ticks 冷却，创造模式豁免。严禁裸听原生聊天事件。

## Develop

```bash
npm install
npm run typecheck
npm test
```

Install into platform:

```bash
sfmc mod install chat-sounds --from dir:. --link
```
