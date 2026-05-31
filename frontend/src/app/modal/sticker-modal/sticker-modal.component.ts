import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { GifsService } from '../../services/gifservice/gifs.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sticker-modal',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './sticker-modal.component.html',
  styleUrl: './sticker-modal.component.css'
})
export class StickerModalComponent implements OnInit,AfterViewInit{
  @ViewChild('searchInput') searchInput!: ElementRef;
  searchTerm: string = '';
  stickers: any[] = [];
  errorMessage:string="";
  recievedSticker:boolean=true;
  @Output() stickerSelected = new EventEmitter<string>();
  loader: boolean=false;


  constructor(private gifsService: GifsService) { }

  ngOnInit(): void {
    this.gifsService.trendingStickers().subscribe(
      (response: any) => {
        this.stickers = response;
      },
      error => {
        this.errorMessage='Error fetching Stickers';
        console.error('Error fetching Stickers', error);
      }
    );
  }

  ngAfterViewInit(): void {
    this.searchInput.nativeElement.focus();
  }
  
  searchStickers() {
    if (this.searchTerm.trim() === '') {
      this.errorMessage="Type something to search";
      return;
    }

    this.loader = true; 
    this.errorMessage = "";  
  
    const timeout = setTimeout(() => {
      this.loader = false;
    }, 2000);

    this.gifsService.searchStickers(this.searchTerm).subscribe(
      (response: any) => {
        clearTimeout(timeout);
        this.stickers=[];
        this.loader = false;

        if(response.length!==0){
          this.stickers = response;
          this.recievedSticker = true;
        }
        else{
          this.recievedSticker=false;
          this.errorMessage="Oops! No result found."
        }
      },
      error => {
        clearTimeout(timeout); 
        this.loader = false;
        this.errorMessage='Error fetching Stickers';
        console.error('Error fetching Stickers', error);
      }
    );
  }

  selectSticker(sticker: any) {
    this.stickerSelected.emit(sticker.images.original.url);
  }

  onChange(){
    this.errorMessage="";
    this.recievedSticker=true;
  }
}
