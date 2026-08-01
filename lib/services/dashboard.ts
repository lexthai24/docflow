import "server-only";
import { db } from "@/lib/db";
import { visibleDocumentsWhere } from "@/lib/auth/access-control";
import type { CurrentUser } from "@/lib/auth/dal";

// บริการดึงข้อมูล Dashboard จาก PostgreSQL จริง (สเปคหมวด 5)
// ทุก query ผ่าน permission filter (visibleDocumentsWhere)

export interface DashboardData {
  stats: {
    totalDocuments: number;
    uploadedThisMonth: number;
    pendingReview: number;
    pendingApproval: number;
    expiringSoon: number;
    storageUsedBytes: number;
    totalUsers: number;
    activity7d: number;
  };
  byStatus: { status: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byFileType: { type: string; count: number }[];
  byMonth: { month: string; count: number }[];
  recentDocuments: {
    id: string;
    title: string;
    documentNumber: string;
    status: string;
    updatedAt: Date;
    ownerName: string;
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    actorName: string | null;
    createdAt: Date;
  }[];
}

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export async function getDashboardData(user: CurrentUser): Promise<DashboardData> {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const visible = await visibleDocumentsWhere(user);
  const activeDocs = { ...visible, deletedAt: null };

  const [
    totalDocuments,
    uploadedThisMonth,
    pendingReview,
    pendingApproval,
    expiringSoon,
    totalUsers,
    activity7d,
    statusGroups,
    recentDocs,
    recentAudit,
  ] = await Promise.all([
    db.document.count({ where: activeDocs }),
    db.document.count({ where: { ...activeDocs, createdAt: { gte: startOfMonth() } } }),
    db.workflowAssignment.count({
      where: { assigneeId: user.id, completed: false, stepType: "REVIEW" },
    }),
    db.workflowAssignment.count({
      where: { assigneeId: user.id, completed: false, stepType: "APPROVAL" },
    }),
    db.document.count({ where: { ...activeDocs, expirationDate: { gte: now, lte: in30 } } }),
    db.user.count({ where: { organizationId: user.organizationId, status: "ACTIVE" } }),
    db.auditLog.count({
      where: { organizationId: user.organizationId, createdAt: { gte: last7 } },
    }),
    db.document.groupBy({
      by: ["status"],
      where: activeDocs,
      _count: { _all: true },
    }),
    db.document.findMany({
      where: activeDocs,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        documentNumber: true,
        status: true,
        updatedAt: true,
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
    db.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  // storage: sum ขนาดของ current versions ที่มองเห็น
  const visibleDocIds = await db.document.findMany({
    where: activeDocs,
    select: { currentVersionId: true },
  });
  const versionIds = visibleDocIds
    .map((d) => d.currentVersionId)
    .filter((id): id is string => Boolean(id));
  const storageAgg = await db.documentVersion.aggregate({
    where: { id: { in: versionIds } },
    _sum: { fileSize: true },
  });

  // by department
  const deptGroups = await db.document.groupBy({
    by: ["departmentId"],
    where: activeDocs,
    _count: { _all: true },
  });
  const deptIds = deptGroups.map((g) => g.departmentId).filter((id): id is string => Boolean(id));
  const depts = await db.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true },
  });
  const deptName = new Map(depts.map((d) => [d.id, d.name]));

  // by file type (extension ของ current version)
  const typeRows = await db.documentVersion.groupBy({
    by: ["extension"],
    where: { id: { in: versionIds } },
    _count: { _all: true },
  });

  // by month (6 เดือนล่าสุด)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthDocs = await db.document.findMany({
    where: { ...activeDocs, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });
  const monthMap = new Map<string, number>();
  const monthLabels = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const doc of monthDocs) {
    const key = `${doc.createdAt.getFullYear()}-${doc.createdAt.getMonth()}`;
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }

  return {
    stats: {
      totalDocuments,
      uploadedThisMonth,
      pendingReview,
      pendingApproval,
      expiringSoon,
      storageUsedBytes: storageAgg._sum.fileSize ? Number(storageAgg._sum.fileSize) : 0,
      totalUsers,
      activity7d,
    },
    byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    byDepartment: deptGroups
      .map((g) => ({ name: g.departmentId ? deptName.get(g.departmentId) ?? "ไม่ระบุ" : "ไม่ระบุ", count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    byFileType: typeRows
      .map((g) => ({ type: g.extension.toUpperCase(), count: g._count._all }))
      .sort((a, b) => b.count - a.count),
    byMonth: Array.from(monthMap.entries()).map(([key, count]) => {
      const [, m] = key.split("-");
      return { month: monthLabels[Number(m)], count };
    }),
    recentDocuments: recentDocs.map((d) => ({
      id: d.id,
      title: d.title,
      documentNumber: d.documentNumber,
      status: d.status,
      updatedAt: d.updatedAt,
      ownerName: `${d.owner.firstName} ${d.owner.lastName}`,
    })),
    recentActivity: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : null,
      createdAt: a.createdAt,
    })),
  };
}
