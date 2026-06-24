import { Context, Dict, Schema, Universal } from 'koishi';
import { DataService } from '@koishijs/console';
declare module 'koishi' {
    interface Tables {
        'analytics.message': Analytics.Message;
        'analytics.command': Analytics.Command;
    }
}
declare module '@koishijs/console' {
    namespace Console {
        interface Services {
            analytics: Analytics;
        }
    }
}
export interface MessageStats {
    send: number;
    receive: number;
}
export interface ModelTokenUsage {
    model: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    totalTokens: number;
}
export interface ModelTokenUsagePayload {
    day: ModelTokenUsage[];
    week: ModelTokenUsage[];
    month: ModelTokenUsage[];
}
export interface ModelUsageTrendPoint {
    date: number;
    label: string;
    requests: number;
    totalTokens: number;
}
export interface ModelUsageTrendSeries {
    model: string;
    requests: number;
    totalTokens: number;
    points: ModelUsageTrendPoint[];
}
export interface ModelUsageTrendPayload {
    threeDays: ModelUsageTrendSeries[];
    week: ModelUsageTrendSeries[];
    month: ModelUsageTrendSeries[];
}
export interface ChatLunaUsageRangeStats {
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    responseTimeSamples: number;
    totalResponseTime: number;
    averageResponseTime: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    totalTokens: number;
}
export interface ChatLunaUsageRangePayload {
    day: ChatLunaUsageRangeStats;
    week: ChatLunaUsageRangeStats;
    month: ChatLunaUsageRangeStats;
}
export interface ModelPerformanceStats {
    model: string;
    requests: number;
    avgTtftMs: number;
    avgTps: number;
}
export interface ModelPerformancePayload {
    day: ModelPerformanceStats[];
    week: ModelPerformanceStats[];
    month: ModelPerformanceStats[];
}
export interface ChatLunaUsageOverview {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    todayRequests: number;
    weekRequests: number;
    monthRequests: number;
    updatedAt: string;
    previous: ChatLunaUsageRangePayload;
    day: ChatLunaUsageRangeStats;
    week: ChatLunaUsageRangeStats;
    month: ChatLunaUsageRangeStats;
}
declare class Analytics extends DataService<Analytics.Payload> {
    config: Analytics.Config;
    static inject: string[];
    lastUpdate: Date;
    updateHour: number;
    cachedDate: number;
    cachedData: Promise<Analytics.Payload>;
    private messages;
    private commands;
    constructor(ctx: Context, config?: Analytics.Config);
    private createIndex;
    private addAudit;
    private uploadAudit;
    upload(forced?: boolean): Promise<void>;
    private queryRecent;
    private getCommandRate;
    private getDauHistory;
    private getMessageByBot;
    private getMessageByDate;
    private getMessageByHour;
    private getMessageHistoryByHour;
    private getChatLunaUsageOverview;
    private getChatLunaModelUsage;
    private getChatLunaModelTrend;
    private getChatLunaModelPerformance;
    download(): Promise<Analytics.Payload>;
    get(): Promise<Analytics.Payload>;
}
declare namespace Analytics {
    interface Index {
        id?: number;
        date: number;
        hour: number;
        selfId: string;
        platform: string;
    }
    interface Audit extends Index {
        count: number;
    }
    interface Message extends Index {
        type: string;
        count: number;
    }
    interface Command extends Index {
        name: string;
        userId: number;
        channelId: string;
        count: number;
    }
    interface Payload {
        userCount: number;
        userIncrement: number;
        guildCount: number;
        guildIncrement: number;
        dauHistory: number[];
        commandRate: Dict<number>;
        messageByBot: Dict<Dict<MessageStats & Universal.User>>;
        messageByDate: MessageStats[];
        messageByHour: MessageStats[];
        messageHistoryByHour: MessageStats[];
        chatlunaModelUsage: ModelTokenUsagePayload;
        chatlunaModelTrend: ModelUsageTrendPayload;
        chatlunaModelPerformance: ModelPerformancePayload;
        chatlunaUsageOverview: ChatLunaUsageOverview;
    }
    interface Config {
        statsInternal?: number;
    }
    const Config: Schema<Config>;
}
export default Analytics;
