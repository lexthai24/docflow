// Error types มาตรฐานสำหรับทั้งระบบ (สเปคหมวด 26)
// ทุก error มี code + ข้อความภาษาไทยที่ผู้ใช้อ่านเข้าใจ

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "กรุณาเข้าสู่ระบบ") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "คุณไม่มีสิทธิ์ดำเนินการนี้") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors?: Record<string, string[]>;
  constructor(message = "ข้อมูลไม่ถูกต้อง", fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400);
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "ไม่พบข้อมูลที่ต้องการ") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "ข้อมูลขัดแย้งกับที่มีอยู่") {
    super(message, "CONFLICT", 409);
  }
}

export class StorageError extends AppError {
  constructor(message = "เกิดข้อผิดพลาดในการจัดเก็บไฟล์") {
    super(message, "STORAGE_ERROR", 500);
  }
}

export class WorkflowError extends AppError {
  constructor(message = "ไม่สามารถดำเนินการตาม workflow นี้ได้") {
    super(message, "WORKFLOW_ERROR", 422);
  }
}

// แปลง error ใดๆ เป็นรูปแบบที่ปลอดภัยส่งกลับ client (ไม่รั่ว internal detail)
export function toErrorResponse(error: unknown): {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
} {
  if (error instanceof ValidationError) {
    return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  // ไม่เปิดเผยรายละเอียด internal error
  console.error("Unexpected error:", error);
  return { ok: false, code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
}
