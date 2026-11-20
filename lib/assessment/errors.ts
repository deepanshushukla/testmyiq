export class AssessmentError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AssessmentError";
    this.code = code;
  }
}
