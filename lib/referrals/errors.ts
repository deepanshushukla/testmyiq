export class ReferralError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReferralError";
    this.code = code;
  }
}
