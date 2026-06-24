import { Context } from 'koishi';
import type { Session } from 'koishi';
import { DataService } from '@koishijs/plugin-console';
import { ChatLunaUsage } from './utils';
declare class ChatLunaUsageService extends DataService<ChatLunaUsage.Payload> {
    config: ChatLunaUsage.Config;
    constructor(ctx: Context, config: ChatLunaUsage.Config);
    get(): Promise<{
        query: {
            period: ChatLunaUsage.Period;
            groupBy: ChatLunaUsage.GroupBy;
            sortBy: ChatLunaUsage.SortBy;
            desc: boolean;
            page: number;
            pageSize: number;
            listSortBy: ChatLunaUsage.ListSortBy;
            listDesc: boolean;
            start: Date;
            end: Date;
            source?: string;
            model?: string;
            platform?: string;
            chatPlatform?: string;
            callType?: import("koishi-plugin-chatluna/llm-core/platform/usage").ModelUsageCallType;
            guildId?: string;
            userId?: string;
            success?: boolean;
            estimated?: boolean;
            keyword?: string;
        };
        totals: ChatLunaUsage.Summary;
        groups: ChatLunaUsage.Summary[];
        models: ChatLunaUsage.Summary[];
        sources: ChatLunaUsage.Summary[];
        timeline: ChatLunaUsage.Timeline[];
        modelTimeline: {
            model: string;
            points: {
                date: string;
                calls: number;
            }[];
        }[];
        list: {
            total: number;
            page: number;
            pageSize: number;
            rows: {
                inputTokens: number;
                outputTokens: number;
                totalTokens: number;
                estimated: boolean;
                cachedTokens: number;
                reasoningTokens: number;
                id?: number;
                source: string;
                callType: import("koishi-plugin-chatluna/llm-core/platform/usage").ModelUsageCallType;
                platform: string;
                chatPlatform?: string | null;
                model: string;
                usageMetadata: import("@langchain/core/messages").UsageMetadata;
                success: boolean;
                createdAt: Date;
                ttftMs?: number | null;
                totalMs?: number | null;
                tps?: number | null;
                conversationId?: string | null;
                requestId?: string | null;
                userId?: string | null;
                guildId?: string | null;
            }[];
        };
    }>;
    query(input?: ChatLunaUsage.Query): Promise<{
        query: {
            period: ChatLunaUsage.Period;
            groupBy: ChatLunaUsage.GroupBy;
            sortBy: ChatLunaUsage.SortBy;
            desc: boolean;
            page: number;
            pageSize: number;
            listSortBy: ChatLunaUsage.ListSortBy;
            listDesc: boolean;
            start: Date;
            end: Date;
            source?: string;
            model?: string;
            platform?: string;
            chatPlatform?: string;
            callType?: import("koishi-plugin-chatluna/llm-core/platform/usage").ModelUsageCallType;
            guildId?: string;
            userId?: string;
            success?: boolean;
            estimated?: boolean;
            keyword?: string;
        };
        totals: ChatLunaUsage.Summary;
        groups: ChatLunaUsage.Summary[];
        models: ChatLunaUsage.Summary[];
        sources: ChatLunaUsage.Summary[];
        timeline: ChatLunaUsage.Timeline[];
        modelTimeline: {
            model: string;
            points: {
                date: string;
                calls: number;
            }[];
        }[];
        list: {
            total: number;
            page: number;
            pageSize: number;
            rows: {
                inputTokens: number;
                outputTokens: number;
                totalTokens: number;
                estimated: boolean;
                cachedTokens: number;
                reasoningTokens: number;
                id?: number;
                source: string;
                callType: import("koishi-plugin-chatluna/llm-core/platform/usage").ModelUsageCallType;
                platform: string;
                chatPlatform?: string | null;
                model: string;
                usageMetadata: import("@langchain/core/messages").UsageMetadata;
                success: boolean;
                createdAt: Date;
                ttftMs?: number | null;
                totalMs?: number | null;
                tps?: number | null;
                conversationId?: string | null;
                requestId?: string | null;
                userId?: string | null;
                guildId?: string | null;
            }[];
        };
    }>;
    list(input?: ChatLunaUsage.Query): Promise<{
        total: number;
        page: number;
        pageSize: number;
        rows: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
            estimated: boolean;
            cachedTokens: number;
            reasoningTokens: number;
            id?: number;
            source: string;
            callType: import("koishi-plugin-chatluna/llm-core/platform/usage").ModelUsageCallType;
            platform: string;
            chatPlatform?: string | null;
            model: string;
            usageMetadata: import("@langchain/core/messages").UsageMetadata;
            success: boolean;
            createdAt: Date;
            ttftMs?: number | null;
            totalMs?: number | null;
            tps?: number | null;
            conversationId?: string | null;
            requestId?: string | null;
            userId?: string | null;
            guildId?: string | null;
        }[];
    }>;
    cleanup(before?: Date): Promise<void>;
    sendTokens(session: Session, options: ChatLunaUsage.TokenCommandOptions, args: string[]): Promise<string>;
    private tokenReport;
    private search;
    private withDefaults;
    private pageRows;
    private add;
    private finish;
    private groupKey;
    private groupLabel;
    private dateKey;
}
export { ChatLunaUsageService as ChatLunaUsage };
export declare function apply(ctx: Context, config: ChatLunaUsage.Config): void;
export declare const Config: import("schemastery")<ChatLunaUsage.Config>;
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const name = "chatluna-usage";
declare module 'koishi' {
    interface Context {
        chatluna_usage: ChatLunaUsageService;
    }
    interface Tables {
        chatluna_usage: ChatLunaUsage.Record;
    }
}
declare module '@koishijs/plugin-console' {
    namespace Console {
        interface Services {
            chatluna_usage: ChatLunaUsageService;
        }
    }
    interface Events {
        'chatluna-usage/query': (input?: ChatLunaUsage.Query) => Promise<ChatLunaUsage.Payload>;
        'chatluna-usage/list': (input?: ChatLunaUsage.Query) => Promise<ChatLunaUsage.List>;
        'chatluna-usage/cleanup': (before?: string) => Promise<ChatLunaUsage.ActionResult>;
    }
}
