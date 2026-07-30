(async function () {
  const [catalog, categoriesDoc, fightersDoc] = await Promise.all([
    fetch("./challenges/catalog.json").then((r) => r.json()),
    fetch("./challenges/categories.json").then((r) => r.json()),
    fetch("./fighters.json").then((r) => r.json()),
  ]);

  const fighters = fightersDoc.fighters;
  const BASELINE_ID = "no-agent";
  const baselineFighter = fighters.find((f) => f.id === BASELINE_ID) || null;

  function isBaseline(f) {
    return !!(f && f.id === BASELINE_ID);
  }

  function byBaselineFirst(list) {
    return [...list].sort((a, b) => {
      if (a.id === BASELINE_ID) return -1;
      if (b.id === BASELINE_ID) return 1;
      return (a.rank || 99) - (b.rank || 99);
    });
  }

  function seatLabel(f, { short } = {}) {
    if (isBaseline(f)) return short ? "BASE" : `BASE ${f.label}`;
    return `#${f.rank || ""} ${f.label}`;
  }

  function fmtDelta(value, digits = 1) {
    if (value == null || Number.isNaN(value)) return null;
    const n = Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
    if (n === 0) return "=";
    return (n > 0 ? "+" : "") + n;
  }

  const liveFighters = byBaselineFirst(fighters.filter((f) => f.ready));
  document.getElementById("modeLive").textContent = "Live (" + liveFighters.length + ")";
  const pendingFighters = fighters.filter((f) => !f.ready);
  const categories = categoriesDoc.categories;
  const skills = catalog.skills;
  const tierWeights = catalog.tierWeights || { easy: 1, medium: 1.15, hard: 1.35, insane: 1.5 };

  {
    const blurb = document.getElementById("headerBlurb");
    if (blurb) {
      blurb.innerHTML =
        `Starting with AI agent tools, we need to know <strong>what each can handle</strong>, ` +
        `<strong>what they cost to run</strong>, <strong>how much code they write</strong>, ` +
        `and <strong>what the outcome looks like</strong> before we decide which one to roll with.`;
    }
  }

  let activeCategory = "all";
  let skillIndex = 0;
  let stageMode = "live"; // live | all
  let standingsMode = "score"; // score | value | budget | loc
  let briefFighterId = (baselineFighter && baselineFighter.id) || (liveFighters[0] && liveFighters[0].id) || fighters[0].id;
  const gradeCache = new Map();
  const metaCache = new Map();
  const sourceCache = new Map();

  function fmtTok(n) {
    if (n == null || Number.isNaN(n)) return "";
    if (n >= 1000) return (Math.round(n / 100) / 10) + "k";
    return String(n);
  }

  // Scale: 100k tokens ≈ 10 hours of a work laptop left on
  // (about a full workday of “thinking/processing”).
  const TOKENS_PER_LAPTOP_HOUR = 10000;

  function laptopHours(tokens) {
    if (tokens == null || Number.isNaN(tokens)) return null;
    return tokens / TOKENS_PER_LAPTOP_HOUR;
  }

  function fmtHours(h) {
    if (h == null || Number.isNaN(h)) return "—";
    if (h < 0.1) return (Math.round(h * 60) || "<1") + " min";
    if (h < 10) return h.toFixed(1) + " h";
    return Math.round(h) + " h";
  }

  function fmtTokFull(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Math.round(n).toLocaleString();
  }

  function stageFighters() {
    return byBaselineFirst(stageMode === "live" ? liveFighters : fighters);
  }

  async function loadMeta(fighterId, skillId) {
    const key = fighterId + "|" + skillId;
    if (metaCache.has(key)) return metaCache.get(key);
    try {
      const meta = await fetch(`./fighters/${fighterId}/${skillId}.meta.json`).then((r) => {
        if (!r.ok) throw new Error("meta missing");
        return r.json();
      });
      metaCache.set(key, meta);
      return meta;
    } catch (_) {
      metaCache.set(key, null);
      return null;
    }
  }

  function runLine(f, meta) {
    const run = f.run || {};
    const model = (meta && meta.model) || run.model || "Composer";
    if (!f.ready) return "Awaiting API";
    return run.skillUsed ? `${model} · skills on` : `${model} · no skills`;
  }

  function tokenLine(meta) {
    if (!meta || !meta.tokens || meta.tokens.total == null) return "";
    const t = meta.tokens;
    return ` · est. ${fmtTok(t.total)} tok`;
  }

  function filteredSkills() {
    if (activeCategory === "all") return skills.filter((s) => s.track === "core");
    return skills.filter((s) => (s.categories || []).includes(activeCategory));
  }

  function solutionUrl(fighterId, skillId) {
    return `./fighters/${fighterId}/${skillId}.html`;
  }

  async function loadSource(fighterId, skillId) {
    const key = fighterId + "|" + skillId;
    if (sourceCache.has(key)) return sourceCache.get(key);
    const res = await fetch(solutionUrl(fighterId, skillId));
    const text = res.ok ? await res.text() : "";
    sourceCache.set(key, text);
    return text;
  }

  /** Non-blank lines in the solution HTML the agent wrote. */
  function countLoc(src) {
    if (!src) return 0;
    return src.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }

  function fmtLoc(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Math.round(n).toLocaleString() + " loc";
  }

  function isNA(fighter, skill) {
    if (!RumbleChecks.canAttempt(fighter, skill)) return true;
    return false;
  }

  async function gradeCell(fighter, skill) {
    const key = fighter.id + "|" + skill.id;
    if (gradeCache.has(key)) return gradeCache.get(key);
    if (isNA(fighter, skill)) {
      const result = { na: true, letter: "N/A", pct: null, checks: [], earned: 0, possible: 0 };
      gradeCache.set(key, result);
      return result;
    }
    const src = await loadSource(fighter.id, skill.id);
    if (fighter.id === "maptiler" && /N\/A\s*\s*MapTiler has no Directions/i.test(src)) {
      const result = { na: true, letter: "N/A", pct: null, checks: [], earned: 0, possible: 0 };
      gradeCache.set(key, result);
      return result;
    }
    if (!fighter.ready) {
      const result = { na: true, letter: "", pct: null, checks: [], pending: true, earned: 0, possible: 0 };
      gradeCache.set(key, result);
      return result;
    }
    const checkIds =
      (RumbleChecks.resolveCheckIds && RumbleChecks.resolveCheckIds(fighter, skill)) ||
      (skill.checks && skill.checks[fighter.id]) ||
      [];
    const result = RumbleChecks.grade(src, checkIds);
    gradeCache.set(key, result);
    return result;
  }

  function categoryScore(fighter) {
    const list = filteredSkills();
    let sum = 0;
    let weightSum = 0;
    for (const skill of list) {
      const g = gradeCache.get(fighter.id + "|" + skill.id);
      if (!g || g.na || g.pending || g.pct == null) continue;
      const w = tierWeights[skill.tier] || 1;
      sum += g.pct * w;
      weightSum += w;
    }
    if (!weightSum) return null;
    return Math.round((10 * sum) / weightSum) / 10;
  }

  async function categoryTokens(fighter) {
    const list = filteredSkills();
    let total = 0;
    let counted = 0;
    await Promise.all(list.map(async (skill) => {
      if (isNA(fighter, skill) || !fighter.ready) return;
      const meta = await loadMeta(fighter.id, skill.id);
      if (meta && meta.tokens && meta.tokens.total != null) {
        total += meta.tokens.total;
        counted += 1;
      }
    }));
    return counted ? total : null;
  }

  async function skillLoc(fighter, skill) {
    if (!fighter.ready || isNA(fighter, skill)) return null;
    const src = await loadSource(fighter.id, skill.id);
    if (!src) return null;
    return countLoc(src);
  }

  async function categoryLoc(fighter) {
    const list = filteredSkills();
    let total = 0;
    let counted = 0;
    await Promise.all(list.map(async (skill) => {
      if (isNA(fighter, skill) || !fighter.ready) return;
      const n = await skillLoc(fighter, skill);
      if (n != null) {
        total += n;
        counted += 1;
      }
    }));
    return counted ? total : null;
  }

  let tokenScope = "category"; // skill | category
  let costMetric = "tokens"; // tokens | loc

  async function skillTokens(fighter, skill) {
    if (!fighter.ready || isNA(fighter, skill)) return null;
    const meta = await loadMeta(fighter.id, skill.id);
    if (!meta || !meta.tokens || meta.tokens.total == null) return null;
    return meta.tokens.total;
  }

  async function openTokensDlg(metric) {
    if (metric === "tokens" || metric === "loc") costMetric = metric;
    const dlg = document.getElementById("tokensDlg");
    document.getElementById("tokMetricTokens").classList.toggle("active", costMetric === "tokens");
    document.getElementById("tokMetricLoc").classList.toggle("active", costMetric === "loc");
    document.getElementById("tokScopeSkill").classList.toggle("active", tokenScope === "skill");
    document.getElementById("tokScopeCategory").classList.toggle("active", tokenScope === "category");
    await renderTokensDlg();
    dlg.showModal();
  }

  async function renderTokensDlg() {
    const list = filteredSkills();
    const skill = list[skillIndex] || null;
    const cat = categories.find((c) => c.id === activeCategory);
    const scopeLabel = tokenScope === "skill"
      ? (skill ? `${skill.id}: ${skill.title}` : "this skill")
      : (cat ? cat.label + " category" : "category");
    const isLoc = costMetric === "loc";

    document.getElementById("tokensDlgTitle").textContent = isLoc
      ? "Lines of code · comparison"
      : "Token burn · comparison";

    document.getElementById("tokensIntro").textContent = isLoc
      ? `Non-blank lines in the solution HTML for ${scopeLabel}. Same map, different agents — how much code did each write? OSM / MapLibre is first; everyone else is vs that baseline.`
      : `Estimated tokens for ${scopeLabel}. OSM / MapLibre is the baseline (AI with no custom vendor skills) — first bar; everything else is compared to it.`;

    document.getElementById("tokensWhyTitle").textContent = isLoc
      ? "Why line counts differ"
      : "Why some bars dwarf others";

    document.getElementById("tokensWhyBody").innerHTML = isLoc
      ? `We count <strong>non-blank lines</strong> in each seat’s solution HTML (markup, CSS, and JS the agent shipped). ` +
        `Leaner isn’t always better — a short file can miss checks — but for the <em>same skill</em> it’s a fair “how much did they write” signal. ` +
        `Category totals sum every graded skill in the current filter.`
      : `These are <em>estimated</em> run costs, not API receipts. Most of the gap is ` +
        `<strong>skill-pack context</strong>: seats with fat vendor agent skills ` +
        `(especially Mapbox / MapTiler) stuff tens of thousands of tokens into the prompt ` +
        `before the model writes a line. The OSM / MapLibre baseline still uses Cursor Agent, ` +
        `but with <strong>no custom vendor skills</strong>, so its context base stays small. ` +
        `Solution size (HTML length ÷ 4) adds a smaller output slice on top.`;

    const whyMeta = document.getElementById("tokensWhyMeta");
    if (whyMeta && !isLoc) {
      const bases = byBaselineFirst(fighters)
        .filter((f) => f.ready)
        .map((f) => {
          const base = Number((f.run && f.run.inputBaseTokens) || 0);
          return { f, base };
        })
        .sort((a, b) => b.base - a.base);
      const heavy = bases.filter((b) => b.base >= 20000);
      const light = bases.find((b) => isBaseline(b.f));
      whyMeta.innerHTML =
        (heavy.length
          ? `Heaviest skill-context bases: ${heavy.map((b) =>
              `<code>${b.f.label} ~${fmtTok(b.base)}</code>`
            ).join(" · ")}. `
          : "") +
        (light
          ? `Baseline ${light.f.label} sits at <code>~${fmtTok(light.base)}</code> with vendor skills off.`
          : "");
    } else if (whyMeta) {
      whyMeta.innerHTML = `This skill = one map file. Category total = sum of non-blank lines across every graded skill in <strong>${scopeLabel}</strong>.`;
    }

    document.getElementById("tokTableHead").innerHTML = isLoc
      ? `<th>Fighter</th><th>Lines</th><th>vs OSM</th><th>Share</th>`
      : `<th>Fighter</th><th>Tokens</th><th>vs OSM</th><th>Laptop-hours</th>`;

    document.getElementById("tokensFootnote").innerHTML = isLoc
      ? `LOC = non-blank lines in <code>fighters/&lt;seat&gt;/&lt;skill&gt;.html</code>. Blank lines and pending seats are excluded.`
      : `Estimate method: skill-context base + (prompt + solution chars ÷ 4) — not provider bills. ` +
        `Scale: <strong>100k tokens ≈ 10 hours</strong> of a work laptop left on ` +
        `(about a full workday of “thinking/processing”).`;

    const rawRows = await Promise.all(fighters.map(async (f) => {
      let value = null;
      if (isLoc) {
        value = tokenScope === "skill" && skill
          ? await skillLoc(f, skill)
          : await categoryLoc(f);
      } else {
        value = tokenScope === "skill" && skill
          ? await skillTokens(f, skill)
          : await categoryTokens(f);
      }
      return { f, value };
    }));

    const rows = byBaselineFirst(rawRows.map((r) => r.f)).map((f) =>
      rawRows.find((r) => r.f.id === f.id)
    );

    const baselineRow = rows.find((r) => isBaseline(r.f));
    const baselineVal = baselineRow && baselineRow.value != null ? baselineRow.value : null;

    const withData = rows.filter((r) => r.value != null);
    const maxVal = withData.reduce((m, r) => Math.max(m, r.value), 0) || 1;
    const sumVal = withData.reduce((s, r) => s + r.value, 0);

    function vsBaselineLabel(value) {
      if (value == null || baselineVal == null || baselineVal === 0) return "—";
      if (value === baselineVal) return "baseline";
      const ratio = value / baselineVal;
      const delta = value - baselineVal;
      const sign = delta > 0 ? "+" : "";
      if (isLoc) return `${ratio.toFixed(1)}× · ${sign}${Math.round(delta).toLocaleString()}`;
      return `${ratio.toFixed(1)}× · ${sign}${fmtTok(delta)}`;
    }

    function fmtPrimary(value) {
      if (value == null) return null;
      return isLoc ? Math.round(value).toLocaleString() : fmtTok(value);
    }

    if (isLoc) {
      document.getElementById("tokensEquiv").innerHTML =
        (baselineVal != null
          ? `<strong>Baseline (OSM / MapLibre): ${fmtLoc(baselineVal)}</strong>` +
            `<span class="equiv-scale">Roster wrote <strong>${Math.round(sumVal).toLocaleString()} non-blank lines</strong> total in this scope. ` +
            `Leaner vs base isn’t an automatic win — check the grade too.</span>`
          : `<strong>${Math.round(sumVal).toLocaleString()} lines</strong> across graded seats`) +
        `<span class="equiv-scale">Same skill prompt for every seat — LOC shows how much HTML/CSS/JS each agent shipped.</span>`;
    } else {
      const sumHours = laptopHours(sumVal);
      const vsBaselineHours = baselineVal != null
        ? laptopHours(Math.max(0, sumVal - baselineVal))
        : null;
      document.getElementById("tokensEquiv").innerHTML =
        (baselineVal != null
          ? `<strong>Baseline (OSM / MapLibre): ${fmtTokFull(baselineVal)} tokens</strong> ≈ ${fmtHours(laptopHours(baselineVal))} laptop-on` +
            `<span class="equiv-scale">Other seats show burn vs this open-stack baseline (Composer, no vendor skills). ` +
            `Roster total ${fmtTokFull(sumVal)} ≈ ${fmtHours(sumHours)}; ` +
            `extra vs baseline ≈ ${fmtHours(vsBaselineHours)}.</span>`
          : `<strong>${fmtTokFull(sumVal)} tokens</strong> across graded seats ≈ ` +
            `<strong>${fmtHours(sumHours)}</strong> of a work laptop left on`) +
        `<span class="equiv-scale">100k tokens ≈ 10 hours of a work laptop left on ` +
        `(about a full workday of “thinking/processing”).</span>`;
    }

    const chart = document.getElementById("tokChart");
    chart.innerHTML = rows.map(({ f, value }) => {
      const pct = value == null ? 0 : Math.max(2, Math.round((100 * value) / maxVal));
      const pending = !f.ready || value == null;
      const isBase = isBaseline(f);
      const vs = isBase ? "baseline" : vsBaselineLabel(value);
      return `<div class="tok-row ${pending ? "pending" : ""} ${isBase ? "baseline" : ""}">
        <span class="tok-row-label" style="color:${f.color}">${seatLabel(f)}</span>
        <div class="tok-bar-track" title="${value == null ? "no estimate" : (isLoc ? fmtLoc(value) : fmtTokFull(value) + " tokens") + " · " + vs}">
          <div class="tok-bar-fill" style="width:${pending ? 0 : pct}%;background:${f.color}"></div>
        </div>
        <span class="tok-row-val">${value == null ? (f.ready ? "—" : "await") : fmtPrimary(value)}</span>
      </div>`;
    }).join("");

    document.getElementById("tokTableBody").innerHTML = rows.map(({ f, value }) => {
      const isBase = isBaseline(f);
      const share = value != null && sumVal ? Math.round((1000 * value) / sumVal) / 10 : null;
      const fourth = isLoc
        ? (share == null ? "—" : share + "%")
        : fmtHours(laptopHours(value));
      return `<tr class="${isBase ? "tok-baseline" : ""}">
        <td style="color:${f.color};font-weight:600">${seatLabel(f)}</td>
        <td class="num">${value == null ? (f.ready ? "—" : "awaiting") : (isLoc ? Math.round(value).toLocaleString() : fmtTokFull(value))}</td>
        <td class="num">${isBase ? "baseline" : vsBaselineLabel(value)}</td>
        <td class="num">${fourth}</td>
      </tr>`;
    }).join("");
  }

  async function renderLeaderboard() {
    const el = document.getElementById("leaderboard");
    const blurbEl = document.getElementById("standingsBlurb");
    const cat = categories.find((c) => c.id === activeCategory);
    const baseName = baselineFighter ? baselineFighter.label : "OSM / MapLibre";
    const catLabel = cat ? cat.label : "All";

    const modeMeta = {
      score: {
        label: `${catLabel} · overall winner`,
        blurb: `#1 = highest grade. BASE (${baseName}) shows grade; others are ± vs that grade.`,
      },
      value: {
        label: `${catLabel} · score + credits`,
        blurb: `#1 = best pts per 1k tokens. BASE shows pts/1k; others are ± vs that efficiency.`,
      },
      budget: {
        label: `${catLabel} · budget friendly`,
        blurb: `#1 = lowest token burn. BASE shows tokens; others are ± vs that burn.`,
      },
      loc: {
        label: `${catLabel} · lean code`,
        blurb: `#1 = fewest non-blank lines in solution HTML. BASE shows LOC; others are ± vs that line count.`,
      },
    };
    const meta = modeMeta[standingsMode] || modeMeta.score;
    document.getElementById("standingsLabel").textContent = meta.label;
    if (blurbEl) blurbEl.textContent = meta.blurb;

    const rows = await Promise.all(fighters.map(async (f) => {
      const score = categoryScore(f);
      const tokens = await categoryTokens(f);
      const loc = await categoryLoc(f);
      const efficiency =
        score != null && tokens != null && tokens > 0
          ? (score / (tokens / 1000))
          : null;
      return { f, score, tokens, loc, efficiency };
    }));

    const baselineRow = rows.find((r) => isBaseline(r.f)) || null;
    const baselineScore = baselineRow ? baselineRow.score : null;
    const baselineTokens = baselineRow ? baselineRow.tokens : null;
    const baselineLoc = baselineRow ? baselineRow.loc : null;
    const baselineEfficiency = baselineRow ? baselineRow.efficiency : null;

    function contenderSortKey(r) {
      if (standingsMode === "budget") {
        if (r.tokens == null || r.score == null) return Number.POSITIVE_INFINITY;
        return r.tokens;
      }
      if (standingsMode === "loc") {
        if (r.loc == null || r.score == null) return Number.POSITIVE_INFINITY;
        return r.loc;
      }
      if (standingsMode === "value") {
        if (r.efficiency == null) return Number.NEGATIVE_INFINITY;
        return r.efficiency;
      }
      if (r.score == null) return Number.NEGATIVE_INFINITY;
      return r.score;
    }

    const contenders = rows
      .filter((r) => !isBaseline(r.f) && r.f.ready && r.score != null)
      .filter((r) => {
        if (standingsMode === "budget") return r.tokens != null;
        if (standingsMode === "loc") return r.loc != null;
        if (standingsMode === "value") return r.efficiency != null;
        return true;
      })
      .sort((a, b) => {
        if (standingsMode === "budget" || standingsMode === "loc") {
          return contenderSortKey(a) - contenderSortKey(b);
        }
        if (standingsMode === "value") {
          const d = contenderSortKey(b) - contenderSortKey(a);
          if (d !== 0) return d;
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (a.tokens || 0) - (b.tokens || 0);
        }
        const d = contenderSortKey(b) - contenderSortKey(a);
        if (d !== 0) return d;
        return (a.tokens || Number.POSITIVE_INFINITY) - (b.tokens || Number.POSITIVE_INFINITY);
      });

    const winner = contenders[0] || null;
    const rankById = new Map(contenders.map((r, i) => [r.f.id, i + 1]));

    const rest = rows
      .filter((r) => !isBaseline(r.f) && !rankById.has(r.f.id))
      .sort((a, b) => (a.f.rank || 99) - (b.f.rank || 99));
    const ordered = [
      ...(baselineRow ? [baselineRow] : []),
      ...contenders,
      ...rest,
    ];

    el.innerHTML = ordered.map((row) => {
      const { f, score, tokens, loc, efficiency } = row;
      const win = winner && winner.f.id === f.id;
      const place = rankById.get(f.id);
      const cls = [
        "stand-item",
        f.ready ? "live" : "pending",
        isBaseline(f) ? "baseline" : "",
        win ? "winner" : "",
      ].join(" ");

      let primary;
      let note;

      if (standingsMode === "budget") {
        primary = tokens != null ? fmtTok(tokens) : "—";
        if (isBaseline(f)) {
          note = "baseline · tokens";
        } else if (tokens != null && baselineTokens != null) {
          const d = tokens - baselineTokens;
          note = (d === 0 ? "=" : (d > 0 ? "+" : "−") + fmtTok(Math.abs(d))) +
            " vs base" +
            (score != null ? ` · grade ${score}` : "");
        } else {
          note = !f.ready ? "awaiting" : (score != null ? `grade ${score}` : "ungraded");
        }
      } else if (standingsMode === "loc") {
        primary = loc != null ? Math.round(loc).toLocaleString() : "—";
        if (isBaseline(f)) {
          note = "baseline · loc";
        } else if (loc != null && baselineLoc != null) {
          const d = loc - baselineLoc;
          note = (d === 0 ? "=" : fmtDelta(d, 0)) +
            " vs base" +
            (score != null ? ` · grade ${score}` : "");
        } else {
          note = !f.ready ? "awaiting" : (score != null ? `grade ${score}` : "ungraded");
        }
      } else if (standingsMode === "value") {
        primary = efficiency != null ? efficiency.toFixed(1) : "—";
        if (isBaseline(f)) {
          note = "baseline · pts/1k";
        } else if (efficiency != null && baselineEfficiency != null) {
          note = `${fmtDelta(efficiency - baselineEfficiency)} vs base` +
            (score != null ? ` · grade ${score}` : "") +
            (tokens != null ? ` · ${fmtTok(tokens)} tok` : "");
        } else {
          note = !f.ready
            ? "awaiting"
            : score != null
              ? `grade ${score}`
              : "ungraded";
        }
      } else {
        primary = score == null ? "—" : score;
        if (isBaseline(f)) {
          note = "baseline · grade";
        } else if (score != null && baselineScore != null) {
          note = `${fmtDelta(score - baselineScore)} vs base` +
            (tokens != null ? ` · ${fmtTok(tokens)} tok` : "");
        } else {
          note = !f.ready
            ? "awaiting"
            : tokens != null
              ? "est. " + fmtTok(tokens)
              : "";
        }
      }

      const rankText = isBaseline(f)
        ? "BASE"
        : place != null
          ? "#" + place
          : (!f.ready ? "—" : "·");

      return `<div class="${cls}" title="${isBaseline(f) ? "Baseline: Cursor Agent with no custom vendor skills" : (f.strength || "")}">
        <span class="stand-rank">${rankText}</span>
        <span class="stand-name" style="color:${f.color}">${f.label}</span>
        <span class="stand-score">${primary}</span>
        <span class="stand-note">${note}</span>
      </div>`;
    }).join("");
  }

  function renderChips() {
    const el = document.getElementById("chips");
    el.innerHTML = categories.map((c) =>
      `<button type="button" class="chip ${c.id === activeCategory ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`
    ).join("");
    el.querySelectorAll(".chip").forEach((btn) => {
      btn.onclick = () => {
        activeCategory = btn.getAttribute("data-cat");
        skillIndex = 0;
        renderAll();
      };
    });
    const cat = categories.find((c) => c.id === activeCategory);
    document.getElementById("chipBlurb").textContent = cat
      ? `${cat.blurb} · Best for: ${cat.bestFor}`
      : "";
  }

  function renderRubric(skill) {
    const promptEl = document.getElementById("rubricPrompt");
    const lettersEl = document.getElementById("rubricLetters");
    const grid = document.getElementById("rubricGrid");
    const adapterOne = document.getElementById("adapterOne");
    const pills = document.getElementById("fighterPills");
    if (!skill) {
      promptEl.textContent = "";
      lettersEl.innerHTML = "";
      grid.innerHTML = "";
      adapterOne.innerHTML = "";
      pills.innerHTML = "";
      return;
    }
    promptEl.textContent = skill.prompt || "";

    pills.innerHTML = byBaselineFirst(fighters).map((f) =>
      `<button type="button" class="fighter-pill ${f.id === briefFighterId ? "on" : ""} ${isBaseline(f) ? "baseline" : ""}" data-id="${f.id}" style="${f.id === briefFighterId ? "color:" + f.color + ";border-color:" + f.color : ""}">${seatLabel(f)}</button>`
    ).join("");
    pills.querySelectorAll(".fighter-pill").forEach((btn) => {
      btn.onclick = () => {
        briefFighterId = btn.getAttribute("data-id");
        renderRubric(skill);
      };
    });

    const f = fighters.find((x) => x.id === briefFighterId) || baselineFighter || fighters[0];
    const run = f.run || {};
    adapterOne.style.borderColor = f.color;
    adapterOne.innerHTML =
      `<strong style="color:${f.color}">${seatLabel(f)}</strong>` +
      (isBaseline(f) ? ` · baseline (AI, no vendor skills)` : "") +
      (f.strength ? ` · ${f.strength}` : "") +
      `<div style="margin-top:6px">${f.adapterPrompt || f.skillsetNote || ""}</div>` +
      (f.agentTestFit ? `<div class="fit">${f.agentTestFit}</div>` : "") +
      (f.agentUrl || (f.agent && f.agent.url)
        ? `<div class="fit" style="margin-top:6px"><a href="${f.agentUrl || f.agent.url}" target="_blank" rel="noopener">Agent skills</a>${f.agentInstall || (f.agent && f.agent.install) ? ` · <code>${f.agentInstall || f.agent.install}</code>` : ""}</div>`
        : "") +
      `<div class="fit" style="margin-top:6px">${
        !f.ready
          ? "Status: awaiting API"
          : isBaseline(f)
            ? `Cursor · ${run.model || "Composer"} · no vendor skills (baseline)`
            : `Cursor · ${run.model || "Composer"} · ${run.skillUsed ? "skills on" : "no vendor skills"}`
      }</div>`;

    const sampleIds =
      (skill.checks &&
        (skill.checks.mapbox ||
          skill.checks["no-agent"] ||
          skill.checks.shared ||
          Object.values(skill.checks).find((v) => Array.isArray(v) && v.length > 1))) ||
      [];
    const sampleRubric = RumbleChecks.rubric(sampleIds);
    lettersEl.innerHTML =
      sampleRubric.letters.map((row) => `<span><b>${row.letter}</b> ≥ ${row.min}%</span>`).join("") +
      `<span>${sampleRubric.note}</span>`;

    const na = isNA(f, skill) || !f.ready;
    if (na) {
      grid.innerHTML = `<p class="na-note">${
        !f.ready
          ? `Awaiting API / packs (${f.sdk || "vendor SDK"}) — not graded yet.`
          : `N/A — missing capability (${(skill.requires || []).join(", ") || "required API"}). Not an F.`
      }</p>`;
      return;
    }
    const checkIds =
      (RumbleChecks.resolveCheckIds && RumbleChecks.resolveCheckIds(f, skill)) ||
      (skill.checks && skill.checks[f.id]) ||
      [];
    const r = RumbleChecks.rubric(checkIds);
    const rows = r.checks.map((c) =>
      `<tr>
        <td class="w">${c.weight}</td>
        <td class="id">${c.id}</td>
        <td>${c.label}</td>
        <td class="why">${c.why || ""}</td>
      </tr>`
    ).join("");
    grid.innerHTML = `
      <p class="na-note" style="margin:0 0 6px">${r.possible} pts · ${r.checks.length} checks</p>
      <table class="rubric-one">
        <thead><tr><th>W</th><th>Id</th><th>Look for</th><th>Why</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4">No checks</td></tr>`}</tbody>
      </table>`;
  }

  function renderPendingStrip() {
    const strip = document.getElementById("pendingStrip");
    if (stageMode !== "live" || !pendingFighters.length) {
      strip.hidden = true;
      strip.innerHTML = "";
      return;
    }
    strip.hidden = false;
    strip.innerHTML =
      `<strong>${pendingFighters.length} seats awaiting API</strong> — shown as pending on the full board, not failing grades.` +
      `<div class="pending-dots">${pendingFighters.map((f) =>
        `<span class="pending-dot"><i style="background:${f.color}"></i>#${f.rank} ${f.label}</span>`
      ).join("")}</div>`;
  }

  async function renderPager() {
    const list = filteredSkills();
    const row = document.getElementById("rubixRow");
    if (!list.length) {
      document.getElementById("skillTitle").textContent = "No skills in this category";
      row.innerHTML = "";
      renderRubric(null);
      renderPendingStrip();
      return;
    }
    skillIndex = Math.max(0, Math.min(skillIndex, list.length - 1));
    const skill = list[skillIndex];
    document.getElementById("skillTitle").textContent = `${skill.id}: ${skill.title}`;
    document.getElementById("skillMeta").innerHTML =
      `<span class="tags">${(skill.categories || []).map((t) => `<span class="tag">${t}</span>`).join("")}</span>
       · ${skill.tier}` +
      (skill.requires ? ` · requires ${skill.requires.join(", ")}` : "");

    const sel = document.getElementById("skillSelect");
    sel.innerHTML = list.map((s, i) =>
      `<option value="${i}" ${i === skillIndex ? "selected" : ""}>${s.id} — ${s.title}</option>`
    ).join("");

    renderRubric(skill);
    renderPendingStrip();

    const shown = stageFighters();
    const baselineGrade = await gradeCell(baselineFighter || { id: BASELINE_ID, ready: true }, skill);
    row.className = "rubix-row" + (stageMode === "all" ? " mode-all" : "");
    row.innerHTML = shown.map((f) => `
      <article class="cell ${f.ready ? "" : "pending-cell"} ${isBaseline(f) ? "baseline-cell" : ""}" data-fighter="${f.id}">
        <div class="cell-head">
          <div>
            <strong style="color:${f.color}">${seatLabel(f)}</strong>
            <div class="cell-sub">${
              isBaseline(f)
                ? "Baseline · Cursor Agent, no vendor skills"
                : f.agentUrl || f.skillsetUrl
                  ? `<a href="${f.agentUrl || f.skillsetUrl}" target="_blank" rel="noopener">${f.skillsetLabel || (f.label + " agent")}</a>`
                  : (f.strength || f.skillsetNote || "")
            }</div>
          </div>
          <div class="grade" id="grade-${f.id}">—</div>
        </div>
        <iframe title="${f.label} ${skill.id}" src="" data-src="${solutionUrl(f.id, skill.id)}"></iframe>
        <div class="cell-foot">
          <span id="pct-${f.id}">grading…</span>
          <button type="button" data-open="${f.id}">Details</button>
        </div>
      </article>
    `).join("");

    await Promise.all(shown.map(async (f) => {
      const g = await gradeCell(f, skill);
      const meta = await loadMeta(f.id, skill.id);
      const loc = (!g.na && !g.pending && f.ready) ? await skillLoc(f, skill) : null;
      const gradeEl = document.getElementById("grade-" + f.id);
      const pctEl = document.getElementById("pct-" + f.id);
      const iframe = row.querySelector(`[data-fighter="${f.id}"] iframe`);
      if (g.na || g.pending) {
        gradeEl.textContent = g.letter;
        gradeEl.className = "grade NA";
        pctEl.textContent = g.pending ? "Awaiting API" : "N/A (capability)";
        iframe.removeAttribute("src");
        iframe.srcdoc = `<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:#05090e;color:#8aa0b4;font:600 14px Outfit,system-ui">${g.pending ? "Awaiting API" : "N/A"}</body>`;
      } else {
        gradeEl.textContent = g.letter;
        gradeEl.className = "grade " + g.letter;
        const vsBase =
          !isBaseline(f) && baselineGrade && !baselineGrade.na && !baselineGrade.pending && baselineGrade.pct != null
            ? ` · ${fmtDelta(g.pct - baselineGrade.pct, 0)} vs base`
            : isBaseline(f)
              ? " · baseline"
              : "";
        const locPart = loc != null ? ` · ${loc} loc` : "";
        pctEl.textContent = `${g.pct}% · ${g.earned}/${g.possible}${vsBase}${locPart}${tokenLine(meta)}`;
        iframe.src = solutionUrl(f.id, skill.id);
      }
      pctEl.title = runLine(f, meta);
    }));

    row.querySelectorAll("[data-open]").forEach((btn) => {
      btn.onclick = () => openDetail(btn.getAttribute("data-open"), skill);
    });

    await renderLeaderboard();
  }

  async function openDetail(fighterId, skill) {
    const f = fighters.find((x) => x.id === fighterId);
    const g = await gradeCell(f, skill);
    const meta = await loadMeta(f.id, skill.id);
    const dlg = document.getElementById("detailDlg");
    document.getElementById("dlgTitle").textContent = `${seatLabel(f)} · ${skill.id} ${skill.title}`;
    document.getElementById("dlgPrompt").textContent = skill.prompt;
    const runEl = document.getElementById("dlgRun");
    if (runEl) {
      const t = meta && meta.tokens;
      const loc = (!g.na && !g.pending) ? await skillLoc(f, skill) : null;
      const baseG = baselineFighter ? await gradeCell(baselineFighter, skill) : null;
      const baseLoc = baselineFighter && !isBaseline(f)
        ? await skillLoc(baselineFighter, skill)
        : null;
      const vsGrade =
        !isBaseline(f) && g && !g.na && !g.pending && baseG && !baseG.na && !baseG.pending && baseG.pct != null
          ? `<div><strong>vs ${baselineFighter.label}:</strong> ${fmtDelta(g.pct - baseG.pct, 0)} pts (${g.pct}% vs ${baseG.pct}% baseline)</div>`
          : isBaseline(f)
            ? `<div><strong>Role:</strong> baseline — Cursor Agent with no custom vendor skills</div>`
            : "";
      const vsLoc =
        loc != null && baseLoc != null
          ? `<div><strong>Lines:</strong> ${loc.toLocaleString()} loc · ${fmtDelta(loc - baseLoc, 0)} vs base (${baseLoc.toLocaleString()} loc)</div>`
          : loc != null
            ? `<div><strong>Lines:</strong> ${loc.toLocaleString()} non-blank loc in solution HTML</div>`
            : "";
      runEl.innerHTML = `
        <div><strong>Tool:</strong> ${(meta && meta.tool) || "Cursor Agent"} · <strong>AI:</strong> ${(meta && meta.model) || (f.run && f.run.model) || "Composer"}</div>
        <div>${(meta && meta.modelNote) || (f.run && f.run.modelNote) || ""}</div>
        <div><strong>Tokens (est.):</strong> ${
          t && t.total != null
            ? `${fmtTok(t.total)} total · in ${fmtTok(t.input)} · out ${fmtTok(t.output)}`
            : "—"
        }</div>
        ${vsLoc}
        ${vsGrade}
        ${f.agentTestFit ? `<div style="margin-top:6px">${f.agentTestFit}</div>` : ""}
      `;
    }
    document.getElementById("dlgOpen").href = solutionUrl(f.id, skill.id);
    document.getElementById("dlgGrade").textContent = g.na || g.pending
      ? (g.pending ? "Pending / awaiting API" : "N/A — fighter lacks required capability")
      : `Grade ${g.letter} (${g.pct}%)${isBaseline(f) ? " · baseline" : ""}`;
    document.getElementById("dlgChecks").innerHTML = (g.checks || []).map((c) => {
      const label = (RumbleChecks.CHECK_LABELS && RumbleChecks.CHECK_LABELS[c.id]) || c.detail || c.id;
      const why = (RumbleChecks.CHECK_WHY && RumbleChecks.CHECK_WHY[c.id]) || "";
      return `<tr><td>${c.weight}</td><td><code>${c.id}</code></td><td>${label}<div style="color:var(--muted);font-size:0.72rem;margin-top:2px">${why}</div></td><td class="${c.pass ? "pass" : "fail"}">${c.pass ? "pass" : "fail"} — ${c.detail}</td></tr>`;
    }).join("") || `<tr><td colspan="4">No checks</td></tr>`;
    document.getElementById("dlgFrame").src = solutionUrl(f.id, skill.id);
    dlg.showModal();
  }

  async function goToBoardTarget(skillId, fighterId) {
    const list = filteredSkills();
    const idx = list.findIndex((s) => s.id === skillId);
    if (idx < 0) return;
    skillIndex = idx;
    const skill = list[skillIndex];

    if (fighterId) {
      const f = fighters.find((x) => x.id === fighterId);
      // Show all seats if the target isn't in the live stage strip.
      if (f && stageMode === "live" && !f.ready) {
        setStageMode("all");
      } else {
        await renderPager();
      }
      document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
      await openDetail(fighterId, skill);
      return;
    }

    await renderPager();
    document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function renderBoard() {
    const list = filteredSkills();
    const thead = document.querySelector("#board thead");
    const tbody = document.querySelector("#board tbody");
    const ordered = byBaselineFirst(fighters);
    thead.innerHTML = `<tr><th>Skill</th>${ordered.map((f) =>
      `<th class="${f.ready ? "" : "pending-col"} ${isBaseline(f) ? "baseline-col" : ""}" style="color:${f.color}">${seatLabel(f)}</th>`
    ).join("")}</tr>`;

    await Promise.all(list.flatMap((skill) => ordered.map((f) => gradeCell(f, skill))));

    tbody.innerHTML = list.map((skill) => {
      const baseG = gradeCache.get(BASELINE_ID + "|" + skill.id);
      const scored = ordered
        .map((f) => {
          const g = gradeCache.get(f.id + "|" + skill.id);
          if (!f.ready || !g || g.na || g.pending || g.pct == null) return null;
          return { f, g };
        })
        .filter(Boolean);
      const bestPct = scored.reduce((m, row) => Math.max(m, row.g.pct), -1);
      const winnerIds = new Set(
        scored.filter((row) => row.g.pct === bestPct).map((row) => row.f.id)
      );

      const cells = ordered.map((f) => {
        const g = gradeCache.get(f.id + "|" + skill.id);
        const pend = !f.ready ? "pending-col" : "";
        const baseCls = isBaseline(f) ? "baseline-col" : "";
        const winCls = winnerIds.has(f.id) ? "board-win" : "";
        let inner;
        if (!g || g.na || g.pending) {
          inner = `<span class="mini-grade" style="color:var(--muted)">${g && g.pending ? "—" : "N/A"}</span>`;
        } else if (isBaseline(f)) {
          inner = `<span class="mini-grade grade ${g.letter}" style="color:inherit">${g.letter}</span><div style="color:var(--muted);font-size:0.68rem">${g.pct}% · base${winnerIds.has(f.id) ? " · #1" : ""}</div>`;
        } else {
          const delta =
            baseG && !baseG.na && !baseG.pending && baseG.pct != null
              ? fmtDelta(g.pct - baseG.pct, 0)
              : null;
          inner = `<span class="mini-grade grade ${g.letter}" style="color:inherit">${g.letter}</span><div style="color:var(--muted);font-size:0.68rem">${g.pct}%${delta != null ? " · " + delta : ""}${winnerIds.has(f.id) ? " · #1" : ""}</div>`;
        }
        return `<td class="board-cell ${pend} ${baseCls} ${winCls}" role="button" tabindex="0" data-skill="${skill.id}" data-fighter="${f.id}" title="${seatLabel(f)} · ${skill.id}${winnerIds.has(f.id) ? " · skill winner" : ""}">${inner}</td>`;
      }).join("");
      return `<tr>
        <td class="skill board-cell" role="button" tabindex="0" data-skill="${skill.id}" title="Open ${skill.id}">
          <strong>${skill.id}</strong> ${skill.title}
          <div class="tags">${(skill.categories || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        </td>${cells}
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".board-cell").forEach((el) => {
      const activate = (e) => {
        e.preventDefault();
        goToBoardTarget(el.getAttribute("data-skill"), el.getAttribute("data-fighter") || null);
      };
      el.onclick = activate;
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") activate(e);
      };
    });

    await renderLeaderboard();
    renderImprovePlaybook();
  }

  function renderImprovePlaybook() {
    const el = document.getElementById("improveGrid");
    const blurbEl = document.getElementById("improveBlurb");
    if (blurbEl) {
      blurbEl.textContent = "Empty for now — fill in after the next agent re-run.";
    }
    if (el) el.innerHTML = "";
  }

  async function renderAll() {
    renderChips();
    await renderPager();
    await renderBoard();
  }

  function setStageMode(mode) {
    stageMode = mode;
    document.getElementById("modeLive").classList.toggle("on", mode === "live");
    document.getElementById("modeAll").classList.toggle("on", mode === "all");
    renderPager();
  }

  document.getElementById("modeLive").onclick = (e) => { e.preventDefault(); setStageMode("live"); };
  document.getElementById("modeAll").onclick = (e) => { e.preventDefault(); setStageMode("all"); };

  document.getElementById("prevSkill").onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    skillIndex = Math.max(0, skillIndex - 1);
    renderPager();
  };
  document.getElementById("nextSkill").onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const list = filteredSkills();
    skillIndex = Math.min(list.length - 1, skillIndex + 1);
    renderPager();
  };
  document.getElementById("skillSelect").onchange = (e) => {
    skillIndex = Number(e.target.value);
    renderPager();
  };
  document.getElementById("gradeAll").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    gradeCache.clear();
    metaCache.clear();
    sourceCache.clear();
    await renderAll();
  };
  document.getElementById("dlgClose").onclick = () => document.getElementById("detailDlg").close();

  document.getElementById("openTokens").onclick = (e) => {
    e.preventDefault();
    openTokensDlg(costMetric);
  };
  document.getElementById("tokensClose").onclick = () => document.getElementById("tokensDlg").close();
  document.getElementById("tokMetricTokens").onclick = async () => {
    costMetric = "tokens";
    document.getElementById("tokMetricTokens").classList.add("active");
    document.getElementById("tokMetricLoc").classList.remove("active");
    await renderTokensDlg();
  };
  document.getElementById("tokMetricLoc").onclick = async () => {
    costMetric = "loc";
    document.getElementById("tokMetricLoc").classList.add("active");
    document.getElementById("tokMetricTokens").classList.remove("active");
    await renderTokensDlg();
  };
  document.getElementById("tokScopeSkill").onclick = async () => {
    tokenScope = "skill";
    document.getElementById("tokScopeSkill").classList.add("active");
    document.getElementById("tokScopeCategory").classList.remove("active");
    await renderTokensDlg();
  };
  document.getElementById("tokScopeCategory").onclick = async () => {
    tokenScope = "category";
    document.getElementById("tokScopeCategory").classList.add("active");
    document.getElementById("tokScopeSkill").classList.remove("active");
    await renderTokensDlg();
  };

  document.querySelectorAll(".stand-mode").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      standingsMode = btn.getAttribute("data-mode") || "score";
      document.querySelectorAll(".stand-mode").forEach((b) => {
        b.classList.toggle("on", b === btn);
      });
      renderLeaderboard();
    };
  });

  await renderAll();
})();
