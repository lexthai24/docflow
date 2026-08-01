import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import { Star } from "lucide-react";
import { FileIcon } from "@/components/documents/file-icon";
import { StatusBadge, ConfidentialityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import type { DocumentListItem } from "@/lib/services/documents";

// รายการเอกสารแบบง่าย (ใช้กับมุมมองพิเศษ: favorites, recent, review ฯลฯ)
// server component — ไม่มี filter/pagination ฝั่ง client

export function SimpleDocumentList({
  items,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  showExpiration,
}: {
  items: DocumentListItem[];
  emptyIcon?: React.ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  showExpiration?: boolean;
}) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ul className="divide-y divide-border">
        {items.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/documents/${doc.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors"
            >
              <FileIcon ext={doc.fileExtension} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{doc.title}</p>
                  {doc.isFavorite && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {doc.documentNumber} · {doc.ownerName}
                  {doc.folderName ? ` · ${doc.folderName}` : ""}
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <ConfidentialityBadge level={doc.confidentialityLevel} />
                <StatusBadge status={doc.status} />
              </div>
              <div className="hidden w-24 text-right text-xs text-muted-foreground md:block">
                {showExpiration && doc.expirationDate
                  ? format(doc.expirationDate, "d MMM yyyy", { locale: th })
                  : formatDistanceToNow(doc.updatedAt, { addSuffix: true, locale: th })}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
