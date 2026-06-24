import type { Context } from 'koishi';
import type { ChatLunaUsage } from './utils';
type RenderTheme = Exclude<ChatLunaUsage.TokenTheme, 'auto'>;
export declare function renderTokenTrend(ctx: Context, puppeteer: Context['puppeteer'], data: ChatLunaUsage.TokenReport, theme?: RenderTheme, mode?: ChatLunaUsage.TokenRenderMode): Promise<"图表渲染失败：未找到图表容器。" | Buffer<ArrayBufferLike> | "图表渲染失败，请检查日志。">;
export {};
