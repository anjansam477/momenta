import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'sanitizeAndCleanHtmlPipe',
  standalone: true
})
export class SanitizeAndCleanHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }
  /**
   * Transforms the input HTML content by sanitizing it and modifying paragraphs
   * based on specific rules. It removes unnecessary line breaks, adds padding
   * to paragraphs or images, and wraps text nodes in spans with padding.
   * 
   * @param content - The raw HTML content to be transformed.
   * @returns The sanitized and modified HTML content as SafeHtml.
   */
  transform(content: string): SafeHtml {
    if (!content) {
      return '';
    }
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const paragraphs = doc.querySelectorAll('p');
    const count = this.removeExtraSpacing(paragraphs);
  
    paragraphs.forEach((paragraph, index) => {
      const nextElement = paragraphs[index + 1];
      const isNextImage = nextElement?.querySelector('img') !== null;
  
      if (paragraph.innerHTML.trim() === '<br>' && isNextImage) {
        paragraph.remove();
      } else {
        const containsImage = paragraph.querySelector('img') !== null;
        if (!containsImage) {
          this.addPadding(paragraph, index === count + 1);
        } else if (containsImage) {
          if (index !== count + 1) {
            this.addPadding(paragraph);
          }
          if (paragraph.childNodes.length > 1 && index === count + 1) {
            this.wrapTextNodesInSpan(paragraph);
          }
        }
      }
    });
  
    // Sanitize and return the modified HTML content
    return this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
  }
  

  /**
 * Adds padding to the specified paragraph element. Optionally adds extra padding
 * to the top.
 * 
 * @param paragraph - The paragraph element to add padding to.
 * @param extraTop - Whether to add extra padding to the top.
 */
  private addPadding(paragraph: HTMLElement, extraTop = false): void {
    paragraph.style.paddingLeft = '24px';
    paragraph.style.paddingRight = '24px';
    if (extraTop) {
      paragraph.style.paddingTop = '24px';
    }
  }

  /**
 * Wraps text nodes within a paragraph element in a span with padding. If an image
 * is encountered before the text, padding is added to the image aswell.
 * 
 * @param paragraph - The paragraph element whose text nodes are to be wrapped.
 */
  private wrapTextNodesInSpan(paragraph: HTMLElement): void {

    Array.from(paragraph.childNodes).forEach((child,index) => {

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;

        if (element.tagName.toLowerCase() === 'img') {
            if (index !== 0) {
                // Content came before this img tag, add padding to the img
                this.addPadding(element);
            }
        }

        if (element.tagName.toLowerCase() === 'span') {
            // Add padding to the span
            element.style.display = 'inline-block';
            this.addPadding(element, true);
        }
    }

      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() !== '') {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.textContent = child.textContent;

        // Add padding to the span
        this.addPadding(span, true);

        paragraph.replaceChild(span, child);
      }
    });
  }

  /**
 * Removes unnecessary <p> tags that contain only line breaks from the beginning
 * of the content. Returns the index of the last removed paragraph or -1 if no
 * paragraphs were removed.
 * 
 * @param paragraphs - The list of paragraph elements to process.
 * @returns The index of the last removed paragraph, or -1 if none were removed.
 */
  private removeExtraSpacing(paragraphs: NodeListOf<Element>): number {
    if (!paragraphs.length) {
      return -1;
    }

    if (paragraphs[0].innerHTML.trim() === '<br>') {
      let current = 0;
      while (paragraphs[current]?.innerHTML.trim() === '<br>') {
        if (paragraphs[current + 1]?.innerHTML.trim() === '<br>') {
          paragraphs[current].remove();
          current = current + 1;
        } else {
          paragraphs[current].remove();
          break;
        }
      }
      return current;
    }
    return -1;
  }
}
