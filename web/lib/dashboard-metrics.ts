/** 与研发看板列名「已上线」一致，表示已交付 */
export const SHIPPED_STATUS_NAME = "已上线";

export type IssueStatRow = {
  projectId: string;
  phase: "BACKLOG" | "ACTIVE" | "CLOSED";
  workflowStatusName: string | null;
};

export type ProjectMetrics = {
  total: number;
  backlog: number;
  closed: number;
  shipped: number;
  inDev: number;
  /** 已进入研发的需求数（已上线 + 研发链上未上线） */
  inPipeline: number;
  /** 交付完成率：已上线 / 已进入研发，0~100，无分母时为 null */
  deliveryRatePercent: number | null;
  /** 已上线占全部录入需求比例 */
  shippedOverTotalPercent: number | null;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function aggregateMetrics(rows: IssueStatRow[]): ProjectMetrics {
  let backlog = 0;
  let closed = 0;
  let shipped = 0;
  let inDev = 0;

  for (const r of rows) {
    if (r.phase === "BACKLOG") {
      backlog += 1;
      continue;
    }
    if (r.phase === "CLOSED") {
      closed += 1;
      continue;
    }
    if (r.phase === "ACTIVE") {
      const name = r.workflowStatusName;
      if (name === SHIPPED_STATUS_NAME) shipped += 1;
      else if (name) inDev += 1;
    }
  }

  const total = rows.length;
  const inPipeline = shipped + inDev;
  const deliveryRatePercent =
    inPipeline > 0 ? round1((100 * shipped) / inPipeline) : null;
  const shippedOverTotalPercent =
    total > 0 ? round1((100 * shipped) / total) : null;

  return {
    total,
    backlog,
    closed,
    shipped,
    inDev,
    inPipeline,
    deliveryRatePercent,
    shippedOverTotalPercent,
  };
}

export function rowsForProject(
  rows: IssueStatRow[],
  projectId: string,
): IssueStatRow[] {
  return rows.filter((r) => r.projectId === projectId);
}
