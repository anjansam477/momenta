import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClipboardService } from 'ngx-clipboard';
import { QRCodeComponent } from 'angularx-qrcode';
import { SafeUrl } from '@angular/platform-browser';
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { WallService } from '../../services/wallservice/wall.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sharemodal',
  standalone: true,
  imports: [QRCodeComponent, FormsModule],
  templateUrl: './sharemodal.component.html',
  styleUrl: './sharemodal.component.css',
})
export class SharemodalComponent {
  @Input() sharedWallUrl = '';
  @Input() wallTitle = '';
  @Input() wallId = '';
  @Input() isCreator = false;
  isLinkCopied = false;
  linkCopied='';
  qrCodeDownloadLink: SafeUrl = "";
  qrCopied="";
  isqrCopied=false;
  inviteEmail = '';
  inviteLink = '';
  isGenerating = false;
  inviteCopied = false;
  @ViewChild('qrcodeElement', { static: false }) qrcodeElement!: ElementRef;

  constructor(
    private clipboardService: ClipboardService,
    private imagesService: BackgroundImageService,
    private changeDetectorRef: ChangeDetectorRef,
    private wallService: WallService,
    private toastr: ToastrService
  ) { }

  shareWhatsApp() {
    const nl = String.fromCharCode(10);
    const msg = "Hey! You're invited to *" + this.wallTitle + "* on Momenta!" + nl + "Share your heartfelt message and be part of something special:" + nl + this.sharedWallUrl;
    const text = encodeURIComponent(msg);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && window.innerWidth < 600) {
      window.location.href = "https://wa.me/?text=" + text;
    } else {
      window.open("https://web.whatsapp.com/send?text=" + text, "_blank");
    }
  }

  shareTwitter() {
    const tweetText = encodeURIComponent('"' + this.wallTitle + '" - a moment worth sharing on Momenta');
    const url = encodeURIComponent(this.sharedWallUrl);
    window.open("https://twitter.com/intent/tweet?text=" + tweetText + "&url=" + url, "_blank");
  }

  shareLinkedIn() {
    const url = encodeURIComponent(this.sharedWallUrl);
    window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + url, "_blank");
  }

  shareFacebook() {
    const url = encodeURIComponent(this.sharedWallUrl);
    window.open("https://www.facebook.com/sharer/sharer.php?u=" + url, "_blank");
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvas = (this.qrcodeElement as any).context?.canvas;
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


      newCanvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const  canvas = (this.qrcodeElement as any).context?.canvas?.toDataURL("image/png")

    if (canvas) {
      const blobData = this.imagesService.convertBase64ToBlob(canvas)
      const blob = new Blob([blobData], { type: "image/png" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "momenta-QR"
      link.click()
    }
  }


  drawCenteredText(ctx: CanvasRenderingContext2D, text: string, yPosition: number, canvasWidth: number) {
    const textWidth = ctx.measureText(text).width;
    const centerX = (canvasWidth - textWidth) / 2;
    ctx.fillText(text, centerX, yPosition);
  }

  generateInviteLink(): void {
    if (!this.inviteEmail || !this.wallId) return;
    this.isGenerating = true;
    this.wallService.generateInviteLink(this.wallId, this.inviteEmail, this.wallTitle).subscribe({
      next: ({ token }) => {
        this.inviteLink = `${window.location.origin}/moment/${this.wallId}?token=${token}`;
        this.isGenerating = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.isGenerating = false;
        this.toastr.error('Failed to generate invite link');
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  copyInviteLink(): void {
    navigator.clipboard.writeText(this.inviteLink).then(() => {
      this.inviteCopied = true;
      this.changeDetectorRef.markForCheck();
      setTimeout(() => { this.inviteCopied = false; this.changeDetectorRef.markForCheck(); }, 3000);
    });
  }
}
