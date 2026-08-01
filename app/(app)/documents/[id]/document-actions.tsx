"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Archive,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Textarea, Label } from "@/components/ui/input";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";
import {
  toggleFavoriteAction,
  submitForReviewAction,
  decisionAction,
  archiveDocumentAction,
  deleteDocumentAction,
} from "../actions";

export interface DocActionFlags {
  documentId: string;
  status: string;
  isFavorite: boolean;
  canDownload: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  canApprove: boolean;
  canArchive: boolean;
  canDelete: boolean;
}

export function DocumentActions(props: DocActionFlags) {
  const router = useRouter();
  const [fav, setFav] = React.useState(props.isFavorite);
  const [loading, setLoading] = React.useState(false);
  const [decisionOpen, setDecisionOpen] = React.useState<null | "REJECTED" | "CHANGES_REQUESTED">(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  async function onFav() {
    const res = await toggleFavoriteAction(props.documentId);
    if (res.ok) setFav(res.data.favorited);
    else toast.error(res.error);
  }

  async function onSubmit() {
    setLoading(true);
    const res = await submitForReviewAction(props.documentId);
    setLoading(false);
    if (res.ok) {
      toast.success("ส่งเอกสารเข้าตรวจสอบแล้ว");
      router.refresh();
    } else toast.error(res.error);
  }

  async function onDecide(decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED", withReason?: string) {
    setLoading(true);
    const res = await decisionAction({ documentId: props.documentId, decision, reason: withReason });
    setLoading(false);
    if (res.ok) {
      toast.success(
        decision === "APPROVED" ? "อนุมัติเอกสารแล้ว" : decision === "REJECTED" ? "ปฏิเสธเอกสารแล้ว" : "ส่งคำขอแก้ไขแล้ว",
      );
      setDecisionOpen(null);
      setReason("");
      router.refresh();
    } else toast.error(res.error);
  }

  async function onArchive() {
    setLoading(true);
    const res = await archiveDocumentAction(props.documentId);
    setLoading(false);
    if (res.ok) {
      toast.success("จัดเก็บเข้าคลังแล้ว");
      setArchiveOpen(false);
      router.refresh();
    } else toast.error(res.error);
  }

  async function onDelete() {
    setLoading(true);
    const res = await deleteDocumentAction(props.documentId);
    setLoading(false);
    if (res.ok) {
      toast.success("ย้ายไปถังขยะแล้ว");
      router.push("/documents");
    } else {
      toast.error(res.error);
      setDeleteOpen(false);
    }
  }

  const showSubmit = props.canSubmit && ["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(props.status);
  const showDecide = props.canDecide && ["IN_REVIEW", "PENDING_APPROVAL"].includes(props.status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onFav} aria-label="รายการโปรด">
        <Star className={fav ? "fill-amber-400 text-amber-400" : ""} />
      </Button>

      {props.canDownload && (
        <a href={`/api/documents/${props.documentId}/download`}>
          <Button variant="secondary">
            <Download /> ดาวน์โหลด
          </Button>
        </a>
      )}

      {showSubmit && (
        <Button onClick={onSubmit} loading={loading}>
          <Send /> ส่งตรวจสอบ
        </Button>
      )}

      {showDecide && (
        <>
          {props.canApprove && (
            <Button variant="primary" onClick={() => onDecide("APPROVED")} loading={loading}>
              <CheckCircle2 /> {props.status === "PENDING_APPROVAL" ? "อนุมัติ" : "ผ่านการตรวจสอบ"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setDecisionOpen("CHANGES_REQUESTED")}>
            <MessageSquareWarning /> ขอแก้ไข
          </Button>
          <Button variant="danger" onClick={() => setDecisionOpen("REJECTED")}>
            <XCircle /> ปฏิเสธ
          </Button>
        </>
      )}

      {(props.canArchive || props.canDelete) && (
        <Dropdown>
          <DropdownTrigger>
            <Button variant="ghost" size="icon" aria-label="ตัวเลือกเพิ่มเติม">
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            {props.canArchive && props.status !== "ARCHIVED" && (
              <DropdownItem onClick={() => setArchiveOpen(true)}>
                <Archive /> จัดเก็บเข้าคลัง
              </DropdownItem>
            )}
            {props.canDelete && (
              <DropdownItem destructive onClick={() => setDeleteOpen(true)}>
                <Trash2 /> ลบเอกสาร
              </DropdownItem>
            )}
          </DropdownContent>
        </Dropdown>
      )}

      {/* Decision reason dialog */}
      <Dialog
        open={Boolean(decisionOpen)}
        onClose={() => setDecisionOpen(null)}
        title={decisionOpen === "REJECTED" ? "ปฏิเสธเอกสาร" : "ขอแก้ไขเอกสาร"}
        description="กรุณาระบุเหตุผล (จำเป็น)"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผล</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="อธิบายเหตุผล..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDecisionOpen(null)}>ยกเลิก</Button>
            <Button
              variant={decisionOpen === "REJECTED" ? "danger" : "primary"}
              loading={loading}
              disabled={!reason.trim()}
              onClick={() => decisionOpen && onDecide(decisionOpen, reason)}
            >
              ยืนยัน
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={onArchive}
        loading={loading}
        variant="primary"
        title="จัดเก็บเข้าคลัง?"
        description="เอกสารจะถูกย้ายเข้าคลังเอกสาร คุณสามารถกู้คืนได้ภายหลัง"
        confirmLabel="จัดเก็บ"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDelete}
        loading={loading}
        title="ย้ายไปถังขยะ?"
        description="เอกสารจะถูกย้ายไปถังขยะ (soft delete) และสามารถกู้คืนได้"
        confirmLabel="ย้ายไปถังขยะ"
      />
    </div>
  );
}
