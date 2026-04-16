"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { isPlatformAdmin, canViewSalary } from "@/lib/platform-role";
import { createOperationLog } from "@/lib/operation-log";

function withMsg(path: string, key: "ok" | "err", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function createSalaryRecord(formData: FormData) {
  try {
    const user = await requireUser();
    if (!canViewSalary(user.globalRole)) {
      return { error: "无权录入薪资" };
    }

    const recipientId = String(formData.get("recipientId") ?? "").trim();
    const amountRaw = Number(formData.get("amount"));
    const projectId = String(formData.get("projectId") ?? "").trim() || null;
    const period = String(formData.get("period") ?? "").trim() || null;
    const note = String(formData.get("note") ?? "").trim() || null;

    if (!recipientId) return { error: "请选择发放对象" };
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      return { error: "请输入有效金额" };
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) return { error: "用户不存在" };

    const record = await prisma.salaryRecord.create({
      data: {
        recipientId,
        amount: amountRaw,
        projectId,
        period,
        note,
      },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: "salary.create",
      projectId,
      targetType: "SalaryRecord",
      targetId: record.id,
      summary: `为 ${recipient.name || recipient.email} 录入薪资 ¥${amountRaw}${period ? `（${period}）` : ""}`,
    });

    revalidatePath("/salary");
    return { ok: true as const, message: "薪资记录已创建" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updateSalaryStatus(
  recordId: string,
  newStatus: "CONFIRMED" | "PAID",
) {
  try {
    const user = await requireUser();
    if (!isPlatformAdmin(user.globalRole)) {
      return { error: "仅管理员可审批薪资" };
    }

    const record = await prisma.salaryRecord.findUnique({
      where: { id: recordId },
      include: { recipient: true },
    });
    if (!record) return { error: "记录不存在" };

    const statusLabel = newStatus === "CONFIRMED" ? "已确认" : "已发放";

    await prisma.salaryRecord.update({
      where: { id: recordId },
      data: { status: newStatus },
    });

    await createOperationLog({
      actorUserId: user.id,
      action: `salary.${newStatus.toLowerCase()}`,
      projectId: record.projectId,
      targetType: "SalaryRecord",
      targetId: record.id,
      summary: `将 ${record.recipient.name || record.recipient.email} 的薪资记录（¥${record.amount}）标记为「${statusLabel}」`,
    });

    revalidatePath("/salary");
    return { ok: true as const, message: `已标记为${statusLabel}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "操作失败" };
  }
}

export async function createSalaryRecordForm(formData: FormData) {
  const r = await createSalaryRecord(formData);
  if ("error" in r && r.error) {
    redirect(withMsg("/salary", "err", r.error));
  }
  redirect(withMsg("/salary", "ok", r.message!));
}

export async function confirmSalaryForm(recordId: string) {
  const r = await updateSalaryStatus(recordId, "CONFIRMED");
  if ("error" in r && r.error) {
    redirect(withMsg("/salary", "err", r.error));
  }
  redirect(withMsg("/salary", "ok", r.message!));
}

export async function markSalaryPaidForm(recordId: string) {
  const r = await updateSalaryStatus(recordId, "PAID");
  if ("error" in r && r.error) {
    redirect(withMsg("/salary", "err", r.error));
  }
  redirect(withMsg("/salary", "ok", r.message!));
}
