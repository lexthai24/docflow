"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { updateGeneralSettingsAction } from "./actions";

export interface OrgSettings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  primaryColor: string;
  timezone: string;
  locale: string;
}

export function SettingsForm({ org }: { org: OrgSettings }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setErrors({});
    const res = await updateGeneralSettingsAction({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      primaryColor: formData.get("primaryColor"),
      timezone: formData.get("timezone"),
      locale: formData.get("locale"),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("บันทึกการตั้งค่าแล้ว");
      router.refresh();
    } else {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      toast.error(res.error);
    }
  }

  return (
    <form action={onSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อองค์กร</Label>
        <Input id="name" name="name" defaultValue={org.name} required aria-invalid={Boolean(errors.name)} />
        {errors.name && <p className="text-xs text-danger">{errors.name[0]}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
          {errors.email && <p className="text-xs text-danger">{errors.email[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">โทรศัพท์</Label>
          <Input id="phone" name="phone" defaultValue={org.phone ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">ที่อยู่</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={org.address ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">สีหลัก</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="primaryColor"
              name="primaryColor"
              defaultValue={org.primaryColor}
              className="h-10 w-14 cursor-pointer rounded border border-input bg-surface"
            />
            <span className="text-sm text-muted-foreground">{org.primaryColor}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">เขตเวลา</Label>
          <Select id="timezone" name="timezone" defaultValue={org.timezone}>
            <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
            <option value="UTC">UTC</option>
            <option value="Asia/Singapore">Asia/Singapore</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="locale">ภาษา</Label>
          <Select id="locale" name="locale" defaultValue={org.locale}>
            <option value="th">ไทย</option>
            <option value="en">English</option>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          <Save /> บันทึกการตั้งค่า
        </Button>
      </div>
    </form>
  );
}
