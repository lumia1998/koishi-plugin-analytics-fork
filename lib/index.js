var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_koishi = require("koishi");
var import_console = require("@koishijs/console");
var import_path = require("path");
var logger = new import_koishi.Logger("analytics");
var MODEL_USAGE_LIMIT = 10;
function createEmptyUsageStats() {
  return {
    requests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0
  };
}
__name(createEmptyUsageStats, "createEmptyUsageStats");
function createEmptyUsageRangePayload() {
  return {
    day: createEmptyUsageStats(),
    week: createEmptyUsageStats(),
    month: createEmptyUsageStats()
  };
}
__name(createEmptyUsageRangePayload, "createEmptyUsageRangePayload");
function createEmptyUsageOverview() {
  return {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 0,
    todayRequests: 0,
    weekRequests: 0,
    monthRequests: 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    previous: createEmptyUsageRangePayload(),
    day: createEmptyUsageStats(),
    week: createEmptyUsageStats(),
    month: createEmptyUsageStats()
  };
}
__name(createEmptyUsageOverview, "createEmptyUsageOverview");
function addUsageStats(target, row) {
  target.requests += 1;
  if (row.success) target.successfulRequests += 1;
  else target.failedRequests += 1;
  const metadata = row.success ? row.usageMetadata : void 0;
  if (!metadata) return;
  target.inputTokens += metadata?.input_tokens ?? 0;
  target.outputTokens += metadata?.output_tokens ?? 0;
  target.cachedTokens += (metadata?.input_token_details?.cache_read ?? 0) + (metadata?.input_token_details?.cache_creation ?? 0);
  target.totalTokens += metadata?.total_tokens ?? 0;
}
__name(addUsageStats, "addUsageStats");
function finishUsageStats(stats) {
  stats.successRate = stats.requests ? stats.successfulRequests / stats.requests : 0;
}
__name(finishUsageStats, "finishUsageStats");
var Analytics = class extends import_console.DataService {
  constructor(ctx, config = {}) {
    super(ctx, "analytics");
    this.config = config;
    ctx.model.extend("analytics.message", {
      date: "integer",
      hour: "integer",
      type: "string(63)",
      selfId: "string(63)",
      platform: "string(63)",
      count: "integer"
    }, {
      primary: ["date", "hour", "type", "selfId", "platform"]
    });
    ctx.model.extend("analytics.command", {
      date: "integer",
      hour: "integer",
      name: "string(63)",
      selfId: "string(63)",
      userId: "integer",
      channelId: "string(63)",
      platform: "string(63)",
      count: "integer"
    }, {
      primary: ["date", "hour", "name", "selfId", "userId", "channelId", "platform"]
    });
    ctx.on("exit", () => this.upload(true));
    ctx.on("dispose", async () => {
      await this.upload(true);
    });
    ctx.on("message", (session) => {
      this.addAudit(this.messages, {
        ...this.createIndex(session),
        type: "receive"
      });
      this.upload();
    });
    ctx.on("send", (session) => {
      this.addAudit(this.messages, {
        ...this.createIndex(session),
        type: "send"
      });
      this.upload();
    });
    ctx.any().before("command/execute", ({ command, session }) => {
      this.addAudit(this.commands, {
        ...this.createIndex(session),
        name: command.name,
        userId: session.user["id"] || 0,
        channelId: session.channelId
      });
      this.upload();
    });
    ctx.console.addEntry({
      dev: (0, import_path.resolve)(__dirname, "../client/index.ts"),
      prod: (0, import_path.resolve)(__dirname, "../dist")
    });
  }
  config;
  static {
    __name(this, "Analytics");
  }
  static inject = ["database", "console"];
  lastUpdate = /* @__PURE__ */ new Date();
  updateHour = this.lastUpdate.getHours();
  cachedDate;
  cachedData;
  messages = [];
  commands = [];
  createIndex(session) {
    return {
      selfId: session.selfId,
      platform: session.platform,
      date: import_koishi.Time.getDateNumber(),
      hour: (/* @__PURE__ */ new Date()).getHours()
    };
  }
  addAudit(buffer, index) {
    const audit = buffer.find((data) => (0, import_koishi.deepEqual)((0, import_koishi.pick)(data, Object.keys(index)), index));
    if (audit) {
      audit.count += 1;
    } else {
      buffer.push({ ...index, count: 1 });
    }
  }
  async uploadAudit(table, buffer) {
    if (!buffer.length) return;
    await this.ctx.database.upsert(table, (row) => buffer.map((audit) => ({
      ...audit,
      count: import_koishi.$.add(import_koishi.$.ifNull(row.count, 0), audit.count)
    })));
    buffer.splice(0);
  }
  async upload(forced = false) {
    const date = /* @__PURE__ */ new Date();
    const dateHour = date.getHours();
    if (forced || +date - +this.lastUpdate > this.config.statsInternal || dateHour !== this.updateHour) {
      this.lastUpdate = date;
      this.updateHour = dateHour;
      await Promise.all([
        this.uploadAudit("analytics.message", this.messages),
        this.uploadAudit("analytics.command", this.commands)
      ]);
      this.cachedDate = void 0;
      this.refresh();
      logger.debug("analytics updated");
    }
  }
  queryRecent() {
    return {
      $gte: import_koishi.Time.getDateNumber() - 30,
      $lte: import_koishi.Time.getDateNumber()
    };
  }
  async getCommandRate(lengthTask) {
    const data = await this.ctx.database.select("analytics.command", {
      date: this.queryRecent()
    }).groupBy(["name"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.sum(row.count), "count")
    }).execute();
    const length = await lengthTask;
    const result = {};
    data.forEach((stat) => {
      result[stat.name] = stat.count / length;
    });
    return result;
  }
  async getDauHistory() {
    const data = await this.ctx.database.select("analytics.command", {
      date: { $gte: import_koishi.Time.getDateNumber() - 30 },
      userId: { $gt: 0 }
    }).groupBy(["date"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.count(row.userId), "count")
    }).execute();
    const result = new Array(31).fill(0);
    const today = import_koishi.Time.getDateNumber();
    data.forEach((stat) => {
      result[today - stat.date] = stat.count;
    });
    return result;
  }
  async getMessageByBot(lengthTask) {
    const data = await this.ctx.database.select("analytics.message", {
      date: this.queryRecent()
    }).groupBy(["type", "platform", "selfId"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.sum(row.count), "count")
    }).execute();
    const length = await lengthTask;
    const result = {};
    data.forEach((stat) => {
      const entry = (result[stat.platform] ||= {})[stat.selfId] ||= {
        ...this.ctx.bots[`${stat.platform}:${stat.selfId}`]?.user,
        send: 0,
        receive: 0
      };
      entry[stat.type] = stat.count / length;
    });
    return result;
  }
  async getMessageByDate() {
    const data = await this.ctx.database.select("analytics.message", {
      date: { $lte: import_koishi.Time.getDateNumber() }
    }).groupBy(["type", "date"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.sum(row.count), "count")
    }).orderBy("date", "desc").execute();
    const today = import_koishi.Time.getDateNumber();
    const result = [];
    data.forEach((stat) => {
      const entry = result[today - stat.date] ||= { send: 0, receive: 0 };
      entry[stat.type] = stat.count;
    });
    for (let i = 0; i < result.length; i++) {
      result[i] ||= { send: 0, receive: 0 };
    }
    return result;
  }
  async getMessageByHour(lengthTask) {
    const data = await this.ctx.database.select("analytics.message", {
      date: this.queryRecent()
    }).groupBy(["type", "hour"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.sum(row.count), "count")
    }).execute();
    const length = await lengthTask;
    const result = new Array(24).fill(null).map(() => ({ send: 0, receive: 0 }));
    data.forEach((stat) => {
      result[stat.hour][stat.type] = stat.count / length;
    });
    return result;
  }
  async getMessageHistoryByHour() {
    const timeNow = /* @__PURE__ */ new Date();
    const currentHour = timeNow.getHours();
    const currentDate = import_koishi.Time.getDateNumber();
    const yesterdayDate = currentDate - 1;
    const data = await this.ctx.database.select("analytics.message", {
      date: { $gte: yesterdayDate, $lte: currentDate }
    }).groupBy(["type", "date", "hour"], {
      count: /* @__PURE__ */ __name((row) => import_koishi.$.sum(row.count), "count")
    }).execute();
    const result = new Array(24).fill(null).map(() => ({ send: 0, receive: 0 }));
    data.forEach((stat) => {
      let hoursAgo = 0;
      if (stat.date === currentDate) {
        if (stat.hour > currentHour) return;
        hoursAgo = currentHour - stat.hour;
      } else if (stat.date === yesterdayDate) {
        if (stat.hour <= currentHour) return;
        hoursAgo = currentHour + 24 - stat.hour;
      } else {
        return;
      }
      if (hoursAgo >= 0 && hoursAgo < 24) {
        result[hoursAgo][stat.type] += stat.count;
      }
    });
    return result;
  }
  async getChatLunaUsageOverview() {
    const overview = createEmptyUsageOverview();
    const end = /* @__PURE__ */ new Date();
    const today = import_koishi.Time.getDateNumber();
    const dayStart = import_koishi.Time.fromDateNumber(today);
    const previousDayStart = import_koishi.Time.fromDateNumber(today - 1);
    const weekStart = import_koishi.Time.fromDateNumber(today - 6);
    const previousWeekStart = import_koishi.Time.fromDateNumber(today - 13);
    const monthStart = import_koishi.Time.fromDateNumber(today - 29);
    const previousMonthStart = import_koishi.Time.fromDateNumber(today - 59);
    try {
      const [allRows, recentRows] = await Promise.all([
        this.ctx.database.get("chatluna_usage", {}),
        this.ctx.database.get("chatluna_usage", {
          createdAt: { $gte: previousMonthStart, $lt: end }
        })
      ]);
      overview.totalRequests = allRows.length;
      for (const row of allRows) {
        if (row.success) overview.successfulRequests += 1;
        else overview.failedRequests += 1;
      }
      overview.successRate = overview.totalRequests ? overview.successfulRequests / overview.totalRequests : 0;
      for (const row of recentRows) {
        const createdAt = +new Date(row.createdAt);
        if (createdAt >= +dayStart) {
          addUsageStats(overview.day, row);
        } else if (createdAt >= +previousDayStart && createdAt < +dayStart) {
          addUsageStats(overview.previous.day, row);
        }
        if (createdAt >= +weekStart) {
          addUsageStats(overview.week, row);
        } else if (createdAt >= +previousWeekStart && createdAt < +weekStart) {
          addUsageStats(overview.previous.week, row);
        }
        if (createdAt >= +monthStart) {
          addUsageStats(overview.month, row);
        } else if (createdAt >= +previousMonthStart && createdAt < +monthStart) {
          addUsageStats(overview.previous.month, row);
        }
      }
      for (const stats of [
        overview.day,
        overview.week,
        overview.month,
        overview.previous.day,
        overview.previous.week,
        overview.previous.month
      ]) {
        finishUsageStats(stats);
      }
      overview.todayRequests = overview.day.requests;
      overview.weekRequests = overview.week.requests;
      overview.monthRequests = overview.month.requests;
      overview.updatedAt = end.toISOString();
    } catch (error) {
      logger.debug(error);
    }
    return overview;
  }
  async getChatLunaModelUsage() {
    const end = /* @__PURE__ */ new Date();
    const today = import_koishi.Time.getDateNumber();
    const ranges = {
      day: import_koishi.Time.fromDateNumber(today),
      week: import_koishi.Time.fromDateNumber(today - 6),
      month: import_koishi.Time.fromDateNumber(today - 29)
    };
    const collect = /* @__PURE__ */ __name(async (start) => {
      try {
        const rows = await this.ctx.database.get("chatluna_usage", {
          createdAt: { $gte: start, $lt: end },
          success: true
        });
        const totals = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const value = row.usageMetadata?.total_tokens ?? 0;
          if (value <= 0) continue;
          totals.set(row.model, (totals.get(row.model) ?? 0) + value);
        }
        const sorted = [...totals.entries()].map(([model, totalTokens]) => ({ model, totalTokens })).sort((a, b) => b.totalTokens - a.totalTokens);
        if (sorted.length <= MODEL_USAGE_LIMIT) return sorted;
        const visibleCount = MODEL_USAGE_LIMIT - 1;
        const hiddenTotal = sorted.slice(visibleCount).reduce((sum, item) => sum + item.totalTokens, 0);
        return [
          ...sorted.slice(0, visibleCount),
          { model: "其他模型", totalTokens: hiddenTotal }
        ];
      } catch (error) {
        logger.debug(error);
        return [];
      }
    }, "collect");
    const [day, week, month] = await Promise.all([
      collect(ranges.day),
      collect(ranges.week),
      collect(ranges.month)
    ]);
    return { day, week, month };
  }
  async download() {
    const messageByDateTask = this.getMessageByDate();
    const lengthTask = messageByDateTask.then((data) => {
      return Math.min(Math.max(data.length - 1, 1), 30);
    });
    const [
      userCount,
      userIncrement,
      guildCount,
      guildIncrement,
      commandRate,
      dauHistory,
      messageByBot,
      messageByDate,
      messageByHour,
      messageHistoryByHour,
      chatlunaModelUsage,
      chatlunaUsageOverview
    ] = await Promise.all([
      this.ctx.database.eval("user", (row) => import_koishi.$.count(row.id)),
      this.ctx.database.eval("user", (row) => import_koishi.$.count(row.id), {
        createdAt: {
          $gte: import_koishi.Time.fromDateNumber(import_koishi.Time.getDateNumber() - 1),
          $lt: import_koishi.Time.fromDateNumber(import_koishi.Time.getDateNumber())
        }
      }),
      this.ctx.database.eval("channel", (row) => import_koishi.$.sum(1), (row) => import_koishi.$.eq(row.id, row.guildId)),
      this.ctx.database.eval("channel", (row) => import_koishi.$.sum(1), (row) => import_koishi.$.and(
        import_koishi.$.eq(row.id, row.guildId),
        import_koishi.$.gte(row.createdAt, import_koishi.Time.fromDateNumber(import_koishi.Time.getDateNumber() - 1)),
        import_koishi.$.lt(row.createdAt, import_koishi.Time.fromDateNumber(import_koishi.Time.getDateNumber()))
      )),
      this.getCommandRate(lengthTask),
      this.getDauHistory(),
      this.getMessageByBot(lengthTask),
      messageByDateTask,
      this.getMessageByHour(lengthTask),
      this.getMessageHistoryByHour(),
      this.getChatLunaModelUsage(),
      this.getChatLunaUsageOverview()
    ]);
    return {
      userCount,
      userIncrement,
      guildCount,
      guildIncrement,
      commandRate,
      dauHistory,
      messageByBot,
      messageByDate,
      messageByHour,
      messageHistoryByHour,
      chatlunaModelUsage,
      chatlunaUsageOverview
    };
  }
  async get() {
    const date = /* @__PURE__ */ new Date();
    const dateNumber = import_koishi.Time.getDateNumber(date, date.getTimezoneOffset());
    if (dateNumber !== this.cachedDate) {
      this.cachedData = this.download();
      this.cachedDate = dateNumber;
    }
    return this.cachedData;
  }
};
((Analytics2) => {
  Analytics2.Config = import_koishi.Schema.object({
    statsInternal: import_koishi.Schema.natural().role("ms").description("统计数据推送的时间间隔。").default(import_koishi.Time.minute * 10)
  });
})(Analytics || (Analytics = {}));
var index_default = Analytics;
//# sourceMappingURL=index.js.map
