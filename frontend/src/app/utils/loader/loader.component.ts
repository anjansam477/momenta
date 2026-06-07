import { Component, DestroyRef, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderService } from '../../services/loaderservice/loader.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-loader',
  standalone: true,
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css'
})
export class LoaderComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  isLoading = true

  constructor (private loaderService: LoaderService){}

  ngOnInit(){
    this.loaderService.isLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading)=>{
      this.isLoading = isLoading;
    });
  }
}
