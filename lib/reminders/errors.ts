export class ReminderError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReminderError";
    this.code = code;
  }
}
