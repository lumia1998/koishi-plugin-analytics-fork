type Child = RawHtml | string | number | boolean | null | undefined | Child[];
type Props = Record<string, unknown> & {
    children?: Child;
};
type NodeType = string | typeof Fragment;
export interface RawHtml {
    __html: string;
}
export declare const Fragment: unique symbol;
export declare function raw(value: string): RawHtml;
export declare function renderHtml(value: Child): string;
export declare function jsx(type: NodeType, props?: Props, _key?: string): RawHtml;
export declare const jsxs: typeof jsx;
export declare namespace JSX {
    type Element = RawHtml;
    interface IntrinsicElements {
        [name: string]: Record<string, unknown>;
    }
}
export {};
