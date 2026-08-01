"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { Send, MessageSquare, CornerDownRight } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addCommentAction } from "../actions";

interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
interface Reply {
  id: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  author: CommentAuthor;
}
export interface CommentThread {
  id: string;
  body: string;
  isInternal: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  editedAt: Date | null;
  author: CommentAuthor;
  replies: Reply[];
}

export function CommentsSection({
  documentId,
  comments,
  canComment,
}: {
  documentId: string;
  comments: CommentThread[];
  canComment: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(text: string, parentId?: string) {
    if (!text.trim()) return;
    setLoading(true);
    const res = await addCommentAction({ documentId, body: text, parentId });
    setLoading(false);
    if (res.ok) {
      setBody("");
      setReplyBody("");
      setReplyTo(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-4">
      {canComment && (
        <div className="flex gap-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="แสดงความคิดเห็น..."
            className="flex-1"
          />
          <Button onClick={() => submit(body)} loading={loading} disabled={!body.trim()} className="self-end">
            <Send /> ส่ง
          </Button>
        </div>
      )}

      {comments.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title="ยังไม่มีความคิดเห็น" description="เป็นคนแรกที่แสดงความคิดเห็นในเอกสารนี้" />
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentBubble author={c.author} body={c.body} createdAt={c.createdAt} edited={Boolean(c.editedAt)} internal={c.isInternal} />
              {/* replies */}
              {c.replies.length > 0 && (
                <ul className="ml-11 space-y-3 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentBubble author={r.author} body={r.body} createdAt={r.createdAt} edited={Boolean(r.editedAt)} />
                    </li>
                  ))}
                </ul>
              )}
              {canComment && (
                <div className="ml-11">
                  {replyTo === c.id ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={1}
                        placeholder="ตอบกลับ..."
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => submit(replyBody, c.id)} loading={loading} disabled={!replyBody.trim()}>
                        ส่ง
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>ยกเลิก</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyTo(c.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <CornerDownRight className="size-3" /> ตอบกลับ
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentBubble({
  author,
  body,
  createdAt,
  edited,
  internal,
}: {
  author: CommentAuthor;
  body: string;
  createdAt: Date;
  edited?: boolean;
  internal?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={`${author.firstName} ${author.lastName}`} src={author.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {author.firstName} {author.lastName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: th })}
          </span>
          {edited && <span className="text-xs text-muted-foreground">(แก้ไขแล้ว)</span>}
          {internal && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              ภายใน
            </span>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{body}</p>
      </div>
    </div>
  );
}
