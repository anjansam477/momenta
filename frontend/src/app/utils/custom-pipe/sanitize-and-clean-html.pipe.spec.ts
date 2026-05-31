import { SanitizeAndCleanHtmlPipe } from './sanitize-and-clean-html.pipe';

describe('SanitizeAndCleanHtmlPipe', () => {
  it('create an instance', () => {
    const sanitizer = {
      bypassSecurityTrustHtml: (html: string) => html
    } as any;
    const pipe = new SanitizeAndCleanHtmlPipe(sanitizer);
    expect(pipe).toBeTruthy();
  });
});
