import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  /**
   * Converts the Html with the given selector to canvas first then that is then converted into a pdf and saved with the given filename.
   * jsPDF + html2canvas (~0.75MB) are dynamically imported so they only load when a
   * download actually happens — keeping them out of the initial bundle.
   * @param selector string
   * @param filename string
   */
  async downloadContent(selector: string, filename: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.error('Element not found to download as PDF.');
      return;
    }

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const canvas = await html2canvas(element, {
      useCORS: true,
      // allowTaint MUST stay false: a tainted canvas makes the subsequent
      // toDataURL() throw a SecurityError and kills the whole export. With
      // useCORS + the media endpoint's Access-Control-Allow-Origin header,
      // images load clean; if CORS ever fails an image is skipped, not fatal.
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      backgroundColor: null,
      ignoreElements: (el) => {
        return el.classList.contains('download-btn');
      }
    });

    const contentDataURL = canvas.toDataURL('image/png');

    // Calculate scaling factor
    const a4Width = 210;
    const a4Height = 297;

    const isLandscape = canvas.width > canvas.height;
    let finalWidth, finalHeight;

    if (isLandscape) {
      // Landscape content
      finalWidth = Math.min(canvas.width, a4Width);
      const scaleFactor = finalWidth / canvas.width;
      finalHeight = canvas.height * scaleFactor;
    } else {
      // Portrait content
      finalHeight = Math.min(canvas.height, a4Height);
      const scaleFactor = finalHeight / canvas.height;
      finalWidth = canvas.width * scaleFactor;
    }

    const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', [finalWidth, finalHeight]);

    pdf.addImage(contentDataURL, 'PNG', 0, 0, finalWidth, finalHeight);

    pdf.save(filename + '.pdf');
  }
}
