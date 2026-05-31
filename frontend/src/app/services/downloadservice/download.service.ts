import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  /**
   * Converts the Html with the given selector to canvas first then that is then converted into a pdf and saved with the given filename.
   * @param selector string
   * @param filename string
   */
  downloadContent(selector: string, filename: string) {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.error('Element not found to download as PDF.');
      return;
    }

    html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      ignoreElements: (el) => {
        return el.classList.contains('download-btn');
      }
    }).then(canvas => {
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
    });
  }
}
