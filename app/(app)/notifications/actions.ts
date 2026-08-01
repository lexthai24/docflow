"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAuthenticated } from "@/lib/auth/dal";
import { toErrorResponse } from "@/lib/errors";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await assertAuthenticated();
    await db.notification.updateMany({
      where: { id, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function markAllReadAction(): Promise<ActionResult> {
  try {
    const user = await assertAuthenticated();
    await db.notification.updateMany({
      where: { recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}
