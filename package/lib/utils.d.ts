import { Context, Schema } from 'koishi';
import type { UsageMetadata } from '@langchain/core/messages';
import type { ModelUsageCallType } from 'koishi-plugin-chatluna/llm-core/platform/usage';
export declare function summary(key: string, label?: string, platform?: string): ChatLunaUsage.Summary;
export declare function calculateTheme(): Exclude<ChatLunaUsage.TokenTheme, 'auto'>;
export declare function queryUsage(ctx: Context, source?: string): Promise<ChatLunaUsage.Summary[]>;
export declare function cleanupUsage(ctx: Context, before?: Date): Promise<void>;
export declare namespace ChatLunaUsage {
    interface Record {
        id?: number;
        source: string;
        callType: ModelUsageCallType;
        platform: string;
        chatPlatform?: string | null;
        model: string;
        usageMetadata: UsageMetadata;
        estimated: boolean;
        success: boolean;
        createdAt: Date;
        ttftMs?: number | null;
        totalMs?: number | null;
        tps?: number | null;
        conversationId?: string | null;
        requestId?: string | null;
        userId?: string | null;
        guildId?: string | null;
    }
    interface ListRow extends Record {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        estimated: boolean;
        cachedTokens: number;
        reasoningTokens: number;
    }
    type Period = 'day' | 'month' | 'year';
    type GroupBy = 'source' | 'model' | 'guild' | 'platform' | 'chatPlatform' | 'callType';
    type SortBy = 'calls' | 'successfulCalls' | 'failedCalls' | 'inputTokens' | 'outputTokens' | 'totalTokens' | 'estimatedTokens' | 'cachedTokens' | 'reasoningTokens' | 'ttftMs' | 'totalMs' | 'tps' | 'successRate';
    type ListSortBy = 'createdAt' | 'inputTokens' | 'outputTokens' | 'totalTokens' | 'cachedTokens' | 'reasoningTokens' | 'ttftMs' | 'totalMs' | 'tps';
    interface Query {
        period?: Period;
        start?: string | Date;
        end?: string | Date;
        groupBy?: GroupBy;
        sortBy?: SortBy;
        desc?: boolean;
        page?: number;
        pageSize?: number;
        listSortBy?: ListSortBy;
        listDesc?: boolean;
        source?: string;
        model?: string;
        platform?: string;
        chatPlatform?: string;
        callType?: ModelUsageCallType;
        guildId?: string;
        userId?: string;
        success?: boolean;
        estimated?: boolean;
        keyword?: string;
    }
    interface Summary {
        key: string;
        label: string;
        platform?: string;
        calls: number;
        successfulCalls: number;
        failedCalls: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        estimatedTokens: number;
        cachedTokens: number;
        reasoningTokens: number;
        timedCalls: number;
        ttftMs: number;
        totalMs: number;
        tps: number;
        successRate: number;
        lastSeen?: Date;
    }
    interface Timeline {
        date: string;
        calls: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cachedTokens: number;
        reasoningTokens: number;
    }
    interface ModelTimeline {
        model: string;
        points: {
            date: string;
            calls: number;
        }[];
    }
    interface List {
        total: number;
        page: number;
        pageSize: number;
        rows: ListRow[];
    }
    type TokenRange = 'day' | 'week' | 'month' | 'all';
    type TokenTheme = 'auto' | 'light' | 'dark';
    type TokenRenderMode = 'both' | 'line' | 'bar';
    interface TokenPoint {
        label: string;
        tokens: number;
        inputTokens: number;
        outputTokens: number;
        models: {
            [model: string]: number;
        };
    }
    interface PluginUsage {
        source: string;
        tokens: number;
        calls: number;
    }
    interface TokenReport {
        range: TokenRange;
        label: string;
        start: Date;
        end: Date;
        totalTokens: number;
        calls: number;
        tpm: number;
        rpm: number;
        points: TokenPoint[];
        plugins?: PluginUsage[];
    }
    interface Payload {
        query: Required<Pick<Query, 'period' | 'groupBy' | 'sortBy' | 'desc' | 'page' | 'pageSize' | 'listSortBy' | 'listDesc'>> & {
            start: Date;
            end: Date;
        } & Query;
        totals: Summary;
        groups: Summary[];
        models: Summary[];
        sources: Summary[];
        timeline: Timeline[];
        modelTimeline: ModelTimeline[];
        list: List;
    }
    interface Config {
        recentDays: number;
        pageSize: number;
        webui: boolean;
        tokensTheme: TokenTheme;
        tokensRenderMode: TokenRenderMode;
    }
    interface TokenCommandOptions {
        day?: boolean;
        week?: boolean;
        month?: boolean;
        all?: boolean;
        plugin?: boolean;
    }
    interface ActionResult {
        success: boolean;
    }
    const Config: Schema<Config>;
    const inject: string[];
}
