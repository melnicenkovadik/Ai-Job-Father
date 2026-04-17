import type {
  ParsedResume,
  ResumeParser,
  ResumeParserInput,
} from '../../src/application/ports/resume-parser';

/**
 * In-memory `ResumeParser` returning a canned `ParsedResume`. Tracks calls
 * for assertion and lets tests inject a thrown error by passing a function
 * instead of a fixed response.
 */
export class FakeResumeParser implements ResumeParser {
  public calls: ResumeParserInput[] = [];

  constructor(
    private readonly responder: ParsedResume | ((input: ResumeParserInput) => ParsedResume),
  ) {}

  async parse(input: ResumeParserInput): Promise<ParsedResume> {
    this.calls.push(input);
    if (typeof this.responder === 'function') {
      return this.responder(input);
    }
    return this.responder;
  }
}
