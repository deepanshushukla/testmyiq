export class ShareError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ShareError";
    this.code = code;
  }
}
