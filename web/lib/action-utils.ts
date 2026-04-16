import { redirect } from "next/navigation";

export function withMsg(path: string, key: "ok" | "err", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export function redirectResult(
  r: { ok?: boolean; message?: string; error?: string },
  successPath: string,
  errorPath?: string,
): never {
  if ("error" in r && r.error) {
    redirect(withMsg(errorPath ?? successPath, "err", r.error));
  }
  redirect(withMsg(successPath, "ok", r.message ?? "操作成功"));
}
