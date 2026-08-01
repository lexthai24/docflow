import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Audit log แบบ append-only (สเปคหมวด 22)
// ห้ามบันทึก password / token / secret — mask ข้อมูลอ่อนไหว

const SENSITIVE_KEYS = ["password", "passwordhash", "token", "tokenhash", "secret", "authsecret"];

function maskSensitive(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitive);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      out[k] = "***";
    } else if (v && typeof v === "object") {
      out[k] = maskSensitive(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function getRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    return { ipAddress: ip, userAgent: h.get("user-agent") };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

export interface AuditInput {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: Record<string, unknown>;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    const meta = await getRequestMeta();
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValues: input.oldValues ? (maskSensitive(input.oldValues) as object) : undefined,
        newValues: input.newValues ? (maskSensitive(input.newValues) as object) : undefined,
        metadata: (input.metadata ?? {}) as object,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  } catch (err) {
    // audit ต้องไม่ทำให้ action หลักล้ม — log แล้วปล่อยผ่าน
    console.error("Failed to write audit log:", err);
  }
}

// action constants ที่ใช้บ่อย
export const AUDIT = {
  LOGIN: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  DOCUMENT_CREATED: "document.created",
  DOCUMENT_VIEWED: "document.viewed",
  DOCUMENT_DOWNLOADED: "document.downloaded",
  DOCUMENT_UPDATED: "document.updated",
  DOCUMENT_DELETED: "document.deleted",
  DOCUMENT_RESTORED: "document.restored",
  DOCUMENT_ARCHIVED: "document.archived",
  VERSION_UPLOADED: "document.version_uploaded",
  VERSION_RESTORED: "document.version_restored",
  DOCUMENT_SHARED: "document.shared",
  WORKFLOW_SUBMITTED: "workflow.submitted",
  WORKFLOW_APPROVED: "workflow.approved",
  WORKFLOW_REJECTED: "workflow.rejected",
  WORKFLOW_CHANGES_REQUESTED: "workflow.changes_requested",
  FOLDER_CREATED: "folder.created",
  COMMENT_CREATED: "comment.created",
  SHARE_LINK_CREATED: "share.link_created",
  SHARE_LINK_REVOKED: "share.link_revoked",
  SETTINGS_CHANGED: "settings.changed",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
} as const;
