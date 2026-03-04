# Self Evolve 插件说明

`self-evolve` 是一个基于 OpenAI 的自学习插件：
- 在回答前检索历史经验（episodic memory）并注入提示词上下文。
- 在用户下一条反馈到来时，对上一轮表现打分（reward），更新记忆的效用值（Q 值）。
- 将本轮轨迹总结为可复用经验（experience），持续沉淀到记忆库。

## 功能概览

- 检索增强：根据当前意图 embedding 在记忆库做相似检索（Phase-A），再结合相似度和 Q 值做策略选择（Phase-B）。
- 反馈学习：把用户后续消息作为反馈候选，使用 LLM 评分后做学习更新。
- 经验写回：将意图、摘要、助手响应、反馈、轨迹写入 `episodic-memory.json`。
- 空库自举：当检索为空时也会创建 pending，收到反馈后仍可写入首批记忆，不再“永远学不到”。

## 实现思路

核心流程（按一轮对话）：
1. `before_prompt_build`
- 先处理上一轮 pending 的学习（若存在）。
- 对当前用户输入做 embedding，并从 store 检索候选记忆。
- 若有候选，注入 `<self-evolve-memories>` 上下文；若无候选，也会保留 pending 以支持自举学习。

2. `agent_end`
- 记录助手输出，补齐本轮轨迹信息。

3. 下一条用户消息到来
- 进入下一次 `before_prompt_build` 时，将该消息视为上一轮反馈。
- reward model 打分，满足门槛后更新 Q 值并追加新经验。

## 插件安装

先卸载旧版本，再安装本地目录版本：

```bash
openclaw plugins uninstall self-evolve
openclaw plugins install /path/to/self-evolve
```

## 设置环境变量

```bash
export OPENAI_API_KEY=sk-xxx
```

## 配置命令

```bash
openclaw config set plugins.entries.self-evolve '{"enabled":true,"config":{"embedding":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"text-embedding-3-small","dimensions":512},"reward":{"provider":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0},"experience":{"summarizer":"openai","apiKey":"${OPENAI_API_KEY}","model":"gpt-4.1-mini","temperature":0}}}'
```

建议配置完成后重启 gateway，使插件与配置立即生效。
