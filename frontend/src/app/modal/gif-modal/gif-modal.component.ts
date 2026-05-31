import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { GifsService } from '../../services/gifservice/gifs.service';
import { CommonModule } from '@angular/common';
import {FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gif-modal',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './gif-modal.component.html',
  styleUrl: './gif-modal.component.css'
})
export class GifModalComponent implements OnInit,AfterViewInit{
  @ViewChild('searchInput') searchInput!: ElementRef;
  searchTerm: string = '';
  gifs: any[] = [];
  errorMessage:string="";
  recievedGifs:boolean=true;
  @Output() gifSelected = new EventEmitter<string>();
  loader: boolean=false;

  constructor(private gifsService: GifsService) { }

  ngOnInit(): void {
    this.gifsService.trendingGifs().subscribe(
      (response: any) => {
        this.gifs = response;
      },
      error => {
        this.errorMessage='Error fetching GIFs';
        console.error('Error fetching GIFs', error);
      }
    );
  }

  ngAfterViewInit(): void {
    this.searchInput.nativeElement.focus();
  }

  searchGifs() {

    if (this.searchTerm.trim() === '') {
      this.errorMessage="Type something to search";
      return;
    }

    this.loader = true; 
    this.errorMessage = "";  
  
    const timeout = setTimeout(() => {
      this.loader = false;
    }, 2000);
    
    this.gifsService.searchGifs(this.searchTerm).subscribe(
      (response: any) => {
        clearTimeout(timeout);
        this.gifs=[];
        this.loader = false;

        if(response.length!==0){
          this.gifs = response;
          this.recievedGifs = true;
        }
        else{
          this.recievedGifs=false;
          this.errorMessage="Oops! No result found."
        }
      },
      error => {
        clearTimeout(timeout); 
        this.loader = false;
        console.error('Error fetching GIFs', error);
        this.errorMessage='Error fetching GIFs';
      }
    );
  }

  selectGif(gif: any) {
    this.gifSelected.emit(gif.images.original.url);
  }

  onChange(){
    this.errorMessage="";
    this.recievedGifs=true;
  }
}
