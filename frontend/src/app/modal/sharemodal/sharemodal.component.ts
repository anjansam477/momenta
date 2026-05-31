import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard';
import { QRCodeComponent } from 'angularx-qrcode';
import { SafeUrl } from '@angular/platform-browser';
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
@Component({
  selector: 'app-sharemodal',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './sharemodal.component.html',
  styleUrl: './sharemodal.component.css',
})
export class SharemodalComponent {
  @Input() sharedWallUrl: string = '';
  @Input() wallTitle: string = '';
  isLinkCopied: boolean = false;
  linkCopied:string='';
  qrCodeDownloadLink: SafeUrl = "";
  qrCopied:string="";
  isqrCopied:boolean=false;
  @ViewChild('qrcodeElement', { static: false }) qrcodeElement: any;

  constructor(
    private clipboardService: ClipboardService,
    private imagesService: BackgroundImageService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  share() {
    const wallUrl = this.sharedWallUrl;
    let baseMessage = `Hey there! 👋
        You’re invited to ${this.wallTitle}! 🎉 Let’s make it memorable — share your message on Momenta and show you care.
        ${wallUrl}`;
    return encodeURIComponent(baseMessage);
  }

  shareWhatsApp() {
    const message = this.share();

    const whatsappUrl = `https://wa.me/?text=${message}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && window.innerWidth < 600) {
      window.location.href = whatsappUrl;
    } else {
      const webWhatsAppUrl = `https://web.whatsapp.com/send?text=${message}`;
      window.open(webWhatsAppUrl, '_blank');
    }
  }

  shareTwitter() {
    const message = this.share();

    const twitterUrl = `https://twitter.com/intent/tweet?url=${message}`;
    window.open(twitterUrl, '_blank');
  }

  shareLinkedIn() {
    const message = this.share();

    navigator.clipboard.writeText(message);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite`;
    window.open(linkedInUrl, '_blank');
  }

  shareFacebook() {
    const message = this.share();

    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${message}`;
    window.open(facebookUrl, '_blank');
  }

  shareGmail() {
    const subject = encodeURIComponent('Check out a new Momenta moment!');
    const message = this.share();

    const gmailUrl = `https://mail.google.com/mail/?view=cm&su=${subject}&body=${message}`;
    window.open(gmailUrl, '_blank');
  }

  copyLink() {    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.sharedWallUrl)
        .then(() => {
          this.linkCopied = 'Link copied to clipboard successfully!';
          this.isLinkCopied = true;
        })
        .catch(() => {
          this.linkCopied='Failed to copy link to clipboard';
          this.isLinkCopied = false;
        });
    } else if (this.clipboardService && this.clipboardService.copy) {
      this.clipboardService.copy(this.sharedWallUrl);
      this.linkCopied='Link copied to clipboard successfully!';
      this.isLinkCopied = true;
    } else {
      this.isLinkCopied = false;
      this.linkCopied='Clipboard copy not supported';
    }
    setTimeout(() => {
      this.isLinkCopied = false;
      this.linkCopied = '';
      this.changeDetectorRef.detectChanges(); 
    }, 5000);
  }  

  dismissModal(){
    this.isLinkCopied = false;
  }

  copyQRCodeToClipboard() {
    const canvas = this.qrcodeElement.context.canvas;
    const newCanvas = document.createElement('canvas');
    // Set canvas dimensions
    newCanvas.width = canvas.width + 200;
    newCanvas.height = canvas.height + 320;

    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {

      const gradient = newCtx.createLinearGradient(0, 0, newCanvas.width, newCanvas.height);
      gradient.addColorStop(0, '#C5EBFF');
      gradient.addColorStop(1, '#E3CCF6');
      newCtx.fillStyle = gradient;
      newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

      newCtx.shadowColor = 'rgba(0, 0, 0, 0.5)'; 
      newCtx.shadowBlur = 10;                     
      newCtx.shadowOffsetX = 5;                   
      newCtx.shadowOffsetY = 5;
      newCtx.drawImage(canvas, 100, 220);

      newCtx.shadowColor = 'transparent';         
      newCtx.shadowBlur = 0;
      newCtx.shadowOffsetX = 0;
      newCtx.shadowOffsetY = 0;
      newCtx.font = 'bold 36px Rubik, sans-serif';
      newCtx.fillStyle = '#404C6A';
      this.drawCenteredText(newCtx,"Momenta", 60, newCanvas.width);
      newCtx.font = '16px Rubik, sans-serif';
      this.drawCenteredText(newCtx,"Connect, Share, Celebrate!", 90, newCanvas.width);

      newCtx.font = 'bold 24px Rubik, sans-serif';
      newCtx.fillStyle = 'black';
      this.drawCenteredText(newCtx,"Scan the QR to join", 150, newCanvas.width);

      newCtx.font = 'bold 18px Rubik, sans-serif';
      this.drawCenteredText(newCtx, this.wallTitle, 180, newCanvas.width);
    

      newCtx.fillStyle = 'rgb(114,106,106)';
      newCtx.font = '14px Rubik, sans-serif';
      this.drawCenteredText(newCtx,"Let your friends know you care, share your", newCanvas.height - 50, newCanvas.width);
      this.drawCenteredText(newCtx,"moment today!", newCanvas.height - 30, newCanvas.width);


      newCanvas.toBlob((blob: any) => {
        navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]).then(() => {
          this.isqrCopied=true;
          this.qrCopied='QR code copied to clipboard successfully!';
          this.changeDetectorRef.detectChanges();
        }).catch(err => {
          this.isqrCopied=false;
          this.qrCopied='Failed to copy QR code to clipboard';
          this.changeDetectorRef.detectChanges();
        });
      }, "image/png");
    } else {
      this.isqrCopied=false;
      this.qrCopied='Failed to copy QR code to clipboard:';
    }
    setTimeout(() => {
      this.qrCopied = '';
      this.isqrCopied=false;
      this.changeDetectorRef.detectChanges(); 
    }, 5000);
  }

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

  saveAsImage() {

    let  canvas = this.qrcodeElement.context.canvas.toDataURL("image/png")

    if (canvas) {
      let blobData = this.imagesService.convertBase64ToBlob(canvas)
      const blob = new Blob([blobData], { type: "image/png" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "momenta-QR"
      link.click()
    }
  }


  drawCenteredText(ctx:any, text:string, yPosition:number, canvasWidth:number) {
    const textWidth = ctx.measureText(text).width;
    const centerX = (canvasWidth - textWidth) / 2;
    ctx.fillText(text, centerX, yPosition);
  }
}
