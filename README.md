# Self Evolve

- [English](#english)
- [中文](#中文)

## English

`self-evolve` is an OpenAI-based self-learning plugin:
- Retrieves episodic memories before answering and prepends them to prompt context.
- Uses the next user message as feedback to score the previous turn.
- Learns over time by updating utility (Q values) and writing new memories.

### Quick Start

> Recommended: upgrade to **openclaw 2026.3.2+** before using this plugin. Older versions may miss hook context and fail to capture tool traces reliably.

1. Install plugin

```bash
openclaw plugins uninstall self-evolve
openclaw plugins install /path/to/self-evolve
```

2. Set env var

```bash
export OPENAI_API_KEY=sk-xxx
```

3. One-shot config

```bash
openclaw config set plugins.entries.self-evolve '{"enabled":true,"config":{"embedding":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"text-embedding-3-small","dimensions":512},"reward":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0},"experience":{"summarizer":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0}}}'
```

4. Restart and verify
- Restart gateway.
- Check logs for:
  - `self-evolve: initialized ...`
  - `self-evolve: feedback scored ... learn=true`

### Feedback Tips

- Praise clearly when it works (for positive reinforcement).
- Point out clearly when it fails (to down-rank bad strategies).
- Explicit feedback is better than vague messages like "ok".

### How It Works

1. `before_prompt_build`
- Tries to learn from previous pending turn.
- Builds embedding and retrieves candidates.
- If candidates exist, injects `<self-evolve-memories>`; if not, still creates pending (bootstrap).

2. `agent_end`
- Captures assistant response.

3. Next user message
- Treated as feedback for previous turn.
- If reward gates pass, updates Q and appends episodic memory.

### Advanced Settings

Default learning gates:
- `runtime.observeTurns=0`
- `runtime.minAbsReward=0.15`
- `runtime.minRewardConfidence=0.55`

Learning modes (`runtime.learnMode`):
- `balanced` (default): prefer tool turns; no-tool turns require high reward/confidence.
- `tools_only`: learn only when tools were called (lowest token cost).
- `all`: learn all turns that pass reward gates (highest token cost).

Balanced-mode no-tool thresholds:
- `runtime.noToolMinAbsReward=0.8`
- `runtime.noToolMinRewardConfidence=0.9`

Switch mode:

```bash
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"tools_only"'
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"all"'
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"balanced"'
```

Memory retention:
- Default `memory.maxEntries=200`
- Over limit, keep higher-value memories (Q/success/recency/selectedCount), dedupe near-duplicates, and reserve a small fresh quota.

```bash
openclaw config set plugins.entries.self-evolve.config.memory.maxEntries 200
```

## 中文

`self-evolve` 是一个基于 OpenAI 的自学习插件：
- 回答前检索 episodic memory 并注入上下文。
- 用用户下一条消息作为上一轮反馈打分。
- 持续更新 Q 值并写入新记忆。

### 快速入门

> 建议先升级到 **openclaw 2026.3.2+**。旧版本可能出现 hook 上下文缺失，导致 tool trace 记录不稳定。

1. 安装插件

```bash
openclaw plugins uninstall self-evolve
openclaw plugins install /path/to/self-evolve
```

2. 设置环境变量

```bash
export OPENAI_API_KEY=sk-xxx
```

3. 一条命令配置

```bash
openclaw config set plugins.entries.self-evolve '{"enabled":true,"config":{"embedding":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"text-embedding-3-small","dimensions":512},"reward":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0},"experience":{"summarizer":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0}}}'
```

4. 重启并验证
- 重启 gateway。
- 查看日志是否出现：
  - `self-evolve: initialized ...`
  - `self-evolve: feedback scored ... learn=true`

### 反馈建议

- 做对时明确表扬（强化正确策略）。
- 做错时明确指出（降低错误策略权重）。
- 明确反馈优于“ok/继续”这类模糊反馈。

### 高级配置

默认学习门槛：
- `runtime.observeTurns=0`
- `runtime.minAbsReward=0.15`
- `runtime.minRewardConfidence=0.55`

学习模式 `runtime.learnMode`：
- `balanced`（默认）：优先学习工具回合；无工具回合需高奖励高置信。
- `tools_only`：仅学习有工具调用的回合（最省 token）。
- `all`：所有通过门槛的回合都学习（最费 token）。

切换示例：

```bash
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"tools_only"'
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"all"'
openclaw config set plugins.entries.self-evolve.config.runtime.learnMode '"balanced"'
```

记忆保留：
- 默认 `memory.maxEntries=200`
- 超限时按综合价值保留，并对高相似记忆去重。

```bash
openclaw config set plugins.entries.self-evolve.config.memory.maxEntries 200
```

### License

MIT
