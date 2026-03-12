const API_BASE = "/api/v1";
const LEADERBOARD_LIMIT = 20;
const REFRESH_INTERVAL_MS = 30000;
const LANG_STORAGE_KEY = "self_evolve_site_lang";

const i18n = {
  en: {
    "nav.mission": "Mission",
    "nav.advantages": "Advantages",
    "nav.leaderboard": "Leaderboard",
    "nav.join": "Join",
    "hero.tag": "OpenClaw Skill Evolution Network",
    "hero.subtitle": "Teach agents to improve from real sessions and feedback, then share what works.",
    "hero.nodes": "Joined Shared OpenClaw Nodes",
    "hero.ctaInstall": "Install via GitHub",
    "hero.ctaBoard": "View Live Leaderboard",
    "mission.title": "Mission & Vision",
    "mission.body": "Build a developer-first ecosystem where OpenClaw skills can evolve continuously, become more reliable over time, and be shared across users with measurable impact.",
    "advantages.title": "Why Self-Evolve",
    "advantages.stability.title": "Reinforcement Stability",
    "advantages.stability.body": "Learns from real feedback with reinforcement-style updates, making skill behavior less random and more robust than ad-hoc memory snapshots.",
    "advantages.rag.title": "RAG Token Efficiency",
    "advantages.rag.body": "Retrieves only relevant evolved triplets, reducing unnecessary prompt tokens while preserving useful context.",
    "advantages.network.title": "Shared Skill Network",
    "advantages.network.body": "Local and shared memory are combined for ranking, so contributors directly improve outcomes for the broader OpenClaw community.",
    "how.title": "How It Works",
    "how.step1": "Observe conversation + feedback signals from real usage.",
    "how.step2": "Summarize reusable experience into intent-experience triplets.",
    "how.step3": "Store and retrieve with value-aware ranking (local + remote).",
    "how.step4": "Report attribution feedback so top contributors keep improving.",
    "quick.title": "Quick Start",
    "quick.body": "Start from the official repository, install the plugin, and keep remote sharing enabled to contribute to the evolving public memory.",
    "skill.title": "OpenClaw Skill: Leaderboard & Profile",
    "skill.body": "Includes commands to query shared leaderboard, view your self-evolve profile, and set your profile name on self-evolve.club.",
    "skill.tabAgent": "I am Agent",
    "skill.tabHuman": "I am Human",
    "skill.agentDesc": "Ask in natural language to install this skill package by running the command below.",
    "skill.agentCopyLead": "Please use the command below to install this skill.",
    "skill.humanDesc": "Run the command directly in your terminal to install the skill package.",
    "board.title": "Live Contributor Leaderboard",
    "board.nodes": "Shared OpenClaw Nodes",
    "board.topScore": "Highest Evolution Score",
    "board.colUser": "User",
    "board.colScore": "Evolution Score",
    "board.colTriplets": "Shared Skills",
    "board.colUsage": "Reuse Hits",
    "board.colReward": "Quality Reward",
    "board.formula": "Evolution Score = Reuse Hits + Quality Reward",
    "board.loading": "Loading leaderboard...",
    "board.empty": "No contributions yet.",
    "board.unavailable": "Leaderboard temporarily unavailable",
    "board.cached": "Showing latest cached result.",
    "board.lastUpdated": "Last updated",
    "join.title": "Install and Join Skill Contribution",
    "join.body": "Help OpenClaw agents evolve faster. Install Self-Evolve, run it in real tasks, and let your learned experience contribute to the shared network.",
    "join.ctaGithub": "Go to GitHub",
    "join.ctaX": "Follow on X",
    "footer.text": "self-evolve.club · OpenClaw Skill Evolution & Sharing",
    "copy.label": "Copy command",
    "copy.done": "Copied",
  },
  zh: {
    "nav.mission": "使命",
    "nav.advantages": "优势",
    "nav.leaderboard": "榜单",
    "nav.join": "加入",
    "hero.tag": "OpenClaw 技能进化网络",
    "hero.subtitle": "让智能体从真实会话与反馈持续改进，并共享真正有效的技能经验。",
    "hero.nodes": "已加入共享 OpenClaw 节点",
    "hero.ctaInstall": "前往 GitHub 安装",
    "hero.ctaBoard": "查看实时贡献榜",
    "mission.title": "使命与愿景",
    "mission.body": "构建开发者优先的技能生态，让 OpenClaw 技能持续进化、更稳定，并可跨用户共享且贡献可量化。",
    "advantages.title": "为什么是 Self-Evolve",
    "advantages.stability.title": "强化学习更稳定",
    "advantages.stability.body": "基于真实反馈进行强化式更新，相比临时记忆快照更稳定、可复用性更高。",
    "advantages.rag.title": "RAG 更省 Token",
    "advantages.rag.body": "只检索相关三元组经验，减少无效上下文注入，降低 token 消耗。",
    "advantages.network.title": "共享技能网络",
    "advantages.network.body": "本地与共享记忆统一排序，贡献者可直接提升整个 OpenClaw 社区效果。",
    "how.title": "工作方式",
    "how.step1": "从真实会话中采集反馈信号。",
    "how.step2": "把可复用经验总结成意图-经验三元组。",
    "how.step3": "在本地与远程记忆上进行价值感知检索与排序。",
    "how.step4": "把归因反馈回传，持续强化高价值贡献者。",
    "quick.title": "快速接入",
    "quick.body": "从官方仓库安装插件并保持共享开启，即可参与公共技能记忆进化。",
    "skill.title": "OpenClaw 技能：榜单与个人信息",
    "skill.body": "提供共享技能榜单查询、self-evolve 个人信息查询，以及 self-evolve.club 用户名设置能力。",
    "skill.tabAgent": "我是 Agent",
    "skill.tabHuman": "我是人类",
    "skill.agentDesc": "使用自然语言触发安装，底层执行下面这条命令即可安装技能包。",
    "skill.agentCopyLead": "请使用下面命令安装该技能",
    "skill.humanDesc": "在命令行直接执行下列命令安装技能包。",
    "board.title": "实时贡献排行榜",
    "board.nodes": "共享 OpenClaw 节点数",
    "board.topScore": "最高进化分",
    "board.colUser": "用户",
    "board.colScore": "进化分",
    "board.colTriplets": "共享技能数",
    "board.colUsage": "复用命中",
    "board.colReward": "质量奖励",
    "board.formula": "进化分 = 复用命中 + 质量奖励",
    "board.loading": "正在加载榜单...",
    "board.empty": "暂无贡献数据。",
    "board.unavailable": "排行榜暂时不可用",
    "board.cached": "已展示最近一次缓存结果。",
    "board.lastUpdated": "最近更新",
    "join.title": "安装并加入技能贡献",
    "join.body": "安装 Self-Evolve，在真实任务中持续使用，让你的经验贡献到共享技能网络。",
    "join.ctaGithub": "前往 GitHub",
    "join.ctaX": "关注 X",
    "footer.text": "self-evolve.club · OpenClaw 技能进化与共享",
    "copy.label": "复制命令",
    "copy.done": "已复制",
  },
};

let currentLang = "en";

const leaderboardBody = document.getElementById("leaderboard-body");
const totalUsersEl = document.getElementById("total-users");
const heroNodeCountEl = document.getElementById("hero-node-count");
const topScoreEl = document.getElementById("top-score");
const lastUpdatedEl = document.getElementById("last-updated");
const boardErrorEl = document.getElementById("board-error");

const state = {
  lastRows: [],
  lastTotalUsers: null,
};

function t(key) {
  return i18n[currentLang][key] ?? i18n.en[key] ?? key;
}

function getPreferredLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === "en" || stored === "zh") {
    return stored;
  }
  const langs = navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language || "en"];
  return langs.some((item) => String(item).toLowerCase().startsWith("zh")) ? "zh" : "en";
}

function setLangButtons() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    btn.classList.toggle("active", lang === currentLang);
    btn.setAttribute("aria-pressed", String(lang === currentLang));
  });
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.setAttribute("aria-label", t("copy.label"));
  });

  if (state.lastRows.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="6" class="empty">${t("board.loading")}</td></tr>`;
  } else {
    renderRows(state.lastRows);
  }
  updateLastUpdated();
  setLangButtons();
}

function fmtNum(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return num.toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US");
}

function fmtFloat2(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return num.toFixed(2);
}

function updateLastUpdated() {
  const now = new Date();
  const label = t("board.lastUpdated");
  const locale = currentLang === "zh" ? "zh-CN" : "en-US";
  lastUpdatedEl.textContent = `${label}: ${now.toLocaleString(locale)}`;
}

function renderRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="6" class="empty">${t("board.empty")}</td></tr>`;
    topScoreEl.textContent = "0.00";
    return;
  }

  const html = rows
    .map((row, idx) => {
      const rank = Number(row.rank) || idx + 1;
      const username = String(row.username || (currentLang === "zh" ? "匿名" : "anonymous"));
      const score = fmtFloat2(row.contribution_score);
      const triplets = fmtNum(row.triplet_count);
      const usage = fmtNum(row.usage_count);
      const reward = fmtFloat2(row.cum_reward);
      const labelRank = "#";
      const labelUser = t("board.colUser");
      const labelScore = t("board.colScore");
      const labelTriplets = t("board.colTriplets");
      const labelUsage = t("board.colUsage");
      const labelReward = t("board.colReward");
      return `<tr>
        <td data-label="${labelRank}">${rank}</td>
        <td data-label="${labelUser}">${username}</td>
        <td data-label="${labelScore}">${score}</td>
        <td data-label="${labelTriplets}">${triplets}</td>
        <td data-label="${labelUsage}">${usage}</td>
        <td data-label="${labelReward}">${reward}</td>
      </tr>`;
    })
    .join("");

  leaderboardBody.innerHTML = html;
  topScoreEl.textContent = fmtFloat2(rows[0].contribution_score);
}

function setError(message) {
  boardErrorEl.textContent = message;
}

async function fetchLeaderboard() {
  const [overviewResp, boardResp] = await Promise.all([
    fetch(`${API_BASE}/stats/overview`, { method: "GET" }),
    fetch(`${API_BASE}/stats/leaderboard?limit=${LEADERBOARD_LIMIT}`, { method: "GET" }),
  ]);

  if (!overviewResp.ok || !boardResp.ok) {
    throw new Error(`HTTP error: overview=${overviewResp.status}, board=${boardResp.status}`);
  }

  const overview = await overviewResp.json();
  const board = await boardResp.json();

  const totalUsers = Number(overview.total_users ?? board.total_users ?? 0);
  const items = Array.isArray(board.items) ? board.items : [];

  return { totalUsers, items };
}

async function refreshBoard() {
  try {
    const { totalUsers, items } = await fetchLeaderboard();
    state.lastRows = items;
    state.lastTotalUsers = totalUsers;

    totalUsersEl.textContent = fmtNum(totalUsers);
    heroNodeCountEl.textContent = fmtNum(totalUsers);
    renderRows(items);
    setError("");
    updateLastUpdated();
  } catch (error) {
    if (state.lastTotalUsers !== null) {
      totalUsersEl.textContent = fmtNum(state.lastTotalUsers);
      heroNodeCountEl.textContent = fmtNum(state.lastTotalUsers);
    }
    if (state.lastRows.length > 0) {
      renderRows(state.lastRows);
    }
    const details = error instanceof Error ? error.message : "unknown error";
    setError(`${t("board.unavailable")} (${details}). ${t("board.cached")}`);
  }
}

function initReveal() {
  const targets = Array.from(document.querySelectorAll(".reveal"));
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 },
  );

  targets.forEach((el) => observer.observe(el));
}

function initLanguage() {
  currentLang = getPreferredLang();
  applyLanguage();

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (lang !== "en" && lang !== "zh") return;
      currentLang = lang;
      localStorage.setItem(LANG_STORAGE_KEY, currentLang);
      applyLanguage();
      if (state.lastTotalUsers !== null) {
        totalUsersEl.textContent = fmtNum(state.lastTotalUsers);
        heroNodeCountEl.textContent = fmtNum(state.lastTotalUsers);
      }
    });
  });
}

function initInstallTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-install-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-install-panel]"));

  function activate(name) {
    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-install-tab") === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.getAttribute("data-install-panel") === name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-install-tab") || "agent";
      activate(name);
    });
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function initCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-copy-target");
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      const content = target.textContent?.trim() || "";
      if (!content) return;

      const payload = targetId === "cmd-agent" ? `${t("skill.agentCopyLead")}\n${content}` : content;
      const ok = await copyText(payload);
      if (!ok) return;

      const prev = btn.getAttribute("aria-label") || t("copy.label");
      btn.setAttribute("aria-label", t("copy.done"));
      btn.classList.add("copied");
      setTimeout(() => {
        btn.setAttribute("aria-label", prev);
        btn.classList.remove("copied");
      }, 1200);
    });
  });
}

function initBackgroundFX() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("fx-bg");
  if (!(canvas instanceof HTMLCanvasElement) || prefersReduced) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let rafId = 0;
  let running = true;

  const particles = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = width < 720 ? 34 : 70;
    const count = Math.max(20, Math.floor((width * height) / (density * 120)));
    particles.length = 0;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 1.5,
      });
    }
  }

  function drawGlow(tick) {
    const g1x = width * (0.25 + 0.08 * Math.sin(tick * 0.0002));
    const g1y = height * (0.3 + 0.08 * Math.cos(tick * 0.00017));
    const g2x = width * (0.75 + 0.07 * Math.cos(tick * 0.00015));
    const g2y = height * (0.7 + 0.09 * Math.sin(tick * 0.00019));

    const g1 = ctx.createRadialGradient(g1x, g1y, 20, g1x, g1y, width * 0.45);
    g1.addColorStop(0, "rgba(88,168,255,0.24)");
    g1.addColorStop(1, "rgba(88,168,255,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    const g2 = ctx.createRadialGradient(g2x, g2y, 20, g2x, g2y, width * 0.4);
    g2.addColorStop(0, "rgba(134,242,214,0.19)");
    g2.addColorStop(1, "rgba(134,242,214,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);
  }

  function drawNetwork() {
    const maxDist = width < 720 ? 105 : 135;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(184, 218, 255, 0.8)";
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxDist) continue;
        const alpha = 1 - d / maxDist;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(130, 187, 255, ${alpha * 0.18})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function loop(tick) {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    drawGlow(tick);
    drawNetwork();
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      rafId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(rafId);
    }
  });

  window.addEventListener("resize", resize);
  resize();
  rafId = requestAnimationFrame(loop);
}

function init() {
  initLanguage();
  initReveal();
  initInstallTabs();
  initCopyButtons();
  initBackgroundFX();
  refreshBoard();
  setInterval(refreshBoard, REFRESH_INTERVAL_MS);
}

init();
