import { MarkerBlock } from "@/lib/types";

interface BlocksViewProps {
  root: MarkerBlock | Record<string, unknown> | undefined | null;
}

interface FlatBlock {
  id: string;
  type: string;
  html: string;
  page: number;
}

const CONTAINER_TYPES = new Set([
  "Document",
  "Page",
  "Group",
  "ListGroup",
  "TableGroup",
  "FigureGroup",
  "PictureGroup",
]);

function isMarkerBlock(value: unknown): value is MarkerBlock {
  return typeof value === "object" && value !== null;
}

function flattenBlocks(node: MarkerBlock, page: number, out: FlatBlock[]) {
  const type = node.block_type || "Unknown";
  const html = (node.html || "").trim();

  if (type === "Page") {
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => flattenBlocks(c, page, out));
    }
    return;
  }

  // Container blocks: descend into children to get the visible leaves.
  if (CONTAINER_TYPES.has(type) && Array.isArray(node.children) && node.children.length > 0) {
    node.children.forEach((c) => flattenBlocks(c, page, out));
    return;
  }

  if (html.length > 0) {
    out.push({
      id: node.id || `${type}-${out.length}`,
      type,
      html,
      page,
    });
  } else if (Array.isArray(node.children)) {
    node.children.forEach((c) => flattenBlocks(c, page, out));
  }
}

function getPages(root: MarkerBlock | Record<string, unknown> | null | undefined): MarkerBlock[] {
  if (!isMarkerBlock(root)) return [];
  const r = root as MarkerBlock;
  // Marker JSON usually wraps everything in a Document with Page children.
  if (Array.isArray(r.children) && r.children.length > 0) {
    const childTypes = new Set(r.children.map((c) => c.block_type));
    if (childTypes.has("Page")) {
      return r.children.filter((c) => c.block_type === "Page");
    }
    // No explicit Page wrapper — treat the root as a single page.
    return [r];
  }
  return [r];
}

const TYPE_COLORS: Record<string, string> = {
  Text: "border-l-blue-500 text-blue-700 dark:text-blue-300",
  SectionHeader: "border-l-rose-500 text-rose-700 dark:text-rose-300",
  PageHeader: "border-l-rose-500 text-rose-700 dark:text-rose-300",
  Table: "border-l-orange-500 text-orange-700 dark:text-orange-300",
  TableOfContents: "border-l-orange-500 text-orange-700 dark:text-orange-300",
  ListItem: "border-l-emerald-500 text-emerald-700 dark:text-emerald-300",
  Caption: "border-l-violet-500 text-violet-700 dark:text-violet-300",
  Figure: "border-l-amber-500 text-amber-700 dark:text-amber-300",
  Picture: "border-l-amber-500 text-amber-700 dark:text-amber-300",
  Equation: "border-l-cyan-500 text-cyan-700 dark:text-cyan-300",
  Code: "border-l-slate-500 text-slate-700 dark:text-slate-300",
  Footnote: "border-l-slate-400 text-slate-600 dark:text-slate-400",
  PageFooter: "border-l-slate-400 text-slate-600 dark:text-slate-400",
  Form: "border-l-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300",
};

function colorForType(type: string): string {
  return TYPE_COLORS[type] || "border-l-muted-foreground text-muted-foreground";
}

export function BlocksView({ root }: BlocksViewProps) {
  const pages = getPages(root);

  if (pages.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No blocks were returned for this document.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pages.map((page, pageIdx) => {
        const blocks: FlatBlock[] = [];
        flattenBlocks(page, pageIdx, blocks);

        return (
          <div key={page.id || pageIdx} className="space-y-3">
            {pages.length > 1 && (
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Page {pageIdx + 1}
              </div>
            )}
            {blocks.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                (No visible blocks on this page.)
              </div>
            ) : (
              blocks.map((block) => (
                <div
                  key={block.id}
                  className={`border-l-4 bg-card border border-border rounded-md p-4 ${colorForType(block.type)}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2">
                    {block.type}
                  </div>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export function flattenAllBlocks(
  root: MarkerBlock | Record<string, unknown> | null | undefined,
): FlatBlock[] {
  const out: FlatBlock[] = [];
  getPages(root).forEach((page, idx) => flattenBlocks(page, idx, out));
  return out;
}

export function blocksToHtml(
  root: MarkerBlock | Record<string, unknown> | null | undefined,
): string {
  return flattenAllBlocks(root)
    .map((b) => b.html)
    .join("\n\n");
}
