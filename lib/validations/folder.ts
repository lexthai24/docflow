import { z } from "zod";

export const CreateFolderSchema = z.object({
  name: z.string().min(1, { error: "กรุณากรอกชื่อโฟลเดอร์" }).max(200).trim(),
  parentId: z.string().nullish(),
  description: z.string().max(1000).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
  departmentId: z.string().nullish(),
});

export const UpdateFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: "กรุณากรอกชื่อโฟลเดอร์" }).max(200).trim(),
  description: z.string().max(1000).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
});

export const MoveFolderSchema = z.object({
  id: z.string().min(1),
  targetParentId: z.string().nullish(),
});

export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type UpdateFolderInput = z.infer<typeof UpdateFolderSchema>;
