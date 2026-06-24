import type { ChatLunaUsage } from './utils';
export declare function formatDate(date: Date): string;
export declare function formatTokenReport(report: ChatLunaUsage.TokenReport): string;
export declare function createTokenReport(range: ChatLunaUsage.TokenRange, start: Date, end: Date, rows: ChatLunaUsage.Record[], withPlugins?: boolean): ChatLunaUsage.TokenReport;
