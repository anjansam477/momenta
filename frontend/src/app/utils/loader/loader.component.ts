import { Component } from '@angular/core';
import { LoaderService } from '../../services/loaderservice/loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css'
})
export class LoaderComponent {

  isLoading: boolean = true

  constructor (private loaderService: LoaderService){}

  ngOnInit(){
    this.loaderService.isLoading$.subscribe((isLoading)=>{
      this.isLoading = isLoading;
    })
  }
}
