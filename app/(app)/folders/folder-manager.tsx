"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus, MoreVertical, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";
import type { FolderNode } from "@/lib/services/folders";
import { createFolderAction, updateFolderAction, deleteFolderAction } from "./actions";

const FOLDER_COLORS = ["#1e3a8a", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#64748b"];

export function FolderManager({
  tree,
  canCreate,
  canUpdate,
  canDelete,
}: {
  tree: FolderNode[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createParent, setCreateParent] = React.useState<string | null>(null);
  const [editFolder, setEditFolder] = React.useState<FolderNode | null>(null);
  const [deleteFolder, setDeleteFolder] = React.useState<FolderNode | null>(null);
  const [loading, setLoading] = React.useState(false);

  const flatCount = React.useMemo(() => {
    let n = 0;
    const walk = (nodes: FolderNode[]) => nodes.forEach((x) => { n++; walk(x.children); });
    walk(tree);
    return n;
  }, [tree]);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const res = await createFolderAction({
      name: formData.get("name"),
      description: formData.get("description") || null,
      color: formData.get("color") || null,
      parentId: createParent,
    });
    setLoading(false);
    if (res.ok) {
      toast.success("สร้างโฟลเดอร์สำเร็จ");
      setCreateOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleEdit(formData: FormData) {
    if (!editFolder) return;
    setLoading(true);
    const res = await updateFolderAction({
      id: editFolder.id,
      name: formData.get("name"),
      description: formData.get("description") || null,
      color: formData.get("color") || null,
    });
    setLoading(false);
    if (res.ok) {
      toast.success("บันทึกการแก้ไขแล้ว");
      setEditFolder(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete() {
    if (!deleteFolder) return;
    setLoading(true);
    const res = await deleteFolderAction(deleteFolder.id);
    setLoading(false);
    if (res.ok) {
      toast.success("ย้ายโฟลเดอร์ไปถังขยะแล้ว");
      setDeleteFolder(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{flatCount} โฟลเดอร์</p>
        {canCreate && (
          <Button onClick={() => { setCreateParent(null); setCreateOpen(true); }}>
            <FolderPlus /> สร้างโฟลเดอร์
          </Button>
        )}
      </div>

      {tree.length === 0 ? (
        <EmptyState
          icon={<Icon name="FolderTree" />}
          title="ยังไม่มีโฟลเดอร์"
          description="สร้างโฟลเดอร์แรกเพื่อเริ่มจัดระเบียบเอกสารของคุณ"
          action={
            canCreate ? (
              <Button onClick={() => { setCreateParent(null); setCreateOpen(true); }}>
                <FolderPlus /> สร้างโฟลเดอร์
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          {tree.map((node) => (
            <FolderRow
              key={node.id}
              node={node}
              depth={0}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canCreate={canCreate}
              onCreateChild={(id) => { setCreateParent(id); setCreateOpen(true); }}
              onEdit={setEditFolder}
              onDelete={setDeleteFolder}
              onOpen={(id) => router.push(`/folders/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="สร้างโฟลเดอร์ใหม่">
        <form action={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อโฟลเดอร์</Label>
            <Input id="name" name="name" required autoFocus placeholder="เช่น สัญญาปี 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย (ไม่บังคับ)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <ColorPicker name="color" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
            <Button type="submit" loading={loading}>สร้าง</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editFolder)} onClose={() => setEditFolder(null)} title="แก้ไขโฟลเดอร์">
        {editFolder && (
          <form action={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อโฟลเดอร์</Label>
              <Input id="edit-name" name="name" required defaultValue={editFolder.name} autoFocus />
            </div>
            <ColorPicker name="color" defaultValue={editFolder.color ?? undefined} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditFolder(null)}>ยกเลิก</Button>
              <Button type="submit" loading={loading}>บันทึก</Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteFolder)}
        onClose={() => setDeleteFolder(null)}
        onConfirm={handleDelete}
        loading={loading}
        title="ย้ายไปถังขยะ?"
        description={`ต้องการย้าย "${deleteFolder?.name}" และเอกสารทั้งหมดไปถังขยะหรือไม่? คุณสามารถกู้คืนได้ภายหลัง`}
        confirmLabel="ย้ายไปถังขยะ"
      />
    </div>
  );
}

function FolderRow({
  node,
  depth,
  canUpdate,
  canDelete,
  canCreate,
  onCreateChild,
  onEdit,
  onDelete,
  onOpen,
}: {
  node: FolderNode;
  depth: number;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onCreateChild: (id: string) => void;
  onEdit: (n: FolderNode) => void;
  onDelete: (n: FolderNode) => void;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className="group flex items-center gap-2 border-b border-border px-3 py-2.5 hover:bg-surface-muted transition-colors last:border-b-0"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={cn("flex size-5 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
          aria-label={expanded ? "ยุบ" : "ขยาย"}
        >
          <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
        </button>
        <button
          onClick={() => onOpen(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Icon
            name={node.icon ?? "Folder"}
            className="size-5 shrink-0"
            style={{ color: node.color ?? "var(--muted-foreground)" }}
          />
          <span className="truncate text-sm font-medium text-foreground">{node.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{node.documentCount} ไฟล์</span>
        </button>

        {(canUpdate || canDelete || canCreate) && (
          <Dropdown>
            <DropdownTrigger>
              <button className="flex size-7 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-surface group-hover:opacity-100" aria-label="ตัวเลือก">
                <MoreVertical className="size-4" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              {canCreate && (
                <DropdownItem onClick={() => onCreateChild(node.id)}>
                  <FolderPlus /> สร้างโฟลเดอร์ย่อย
                </DropdownItem>
              )}
              {canUpdate && (
                <DropdownItem onClick={() => onEdit(node)}>
                  <Pencil /> แก้ไข
                </DropdownItem>
              )}
              {canDelete && (
                <DropdownItem destructive onClick={() => onDelete(node)}>
                  <Trash2 /> ลบ
                </DropdownItem>
              )}
            </DropdownContent>
          </Dropdown>
        )}
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canCreate={canCreate}
            onCreateChild={onCreateChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ))}
    </>
  );
}

function ColorPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [selected, setSelected] = React.useState(defaultValue ?? FOLDER_COLORS[0]);
  return (
    <div className="space-y-2">
      <Label>สี</Label>
      <input type="hidden" name={name} value={selected} />
      <div className="flex flex-wrap gap-2">
        {FOLDER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelected(c)}
            className={cn(
              "size-7 rounded-full border-2 transition-transform",
              selected === c ? "border-foreground scale-110" : "border-transparent",
            )}
            style={{ backgroundColor: c }}
            aria-label={`สี ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
