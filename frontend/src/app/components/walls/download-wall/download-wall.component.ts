import { NgStyle } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WallPostsComponent } from '../wall-posts/wall-posts.component';
import { TitleBarComponent } from '../../../utils/title-bar/title-bar.component';
import { BackgroundImageService } from '../../../services/backgroundimageservice/background-image.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Params } from '@angular/router';
import { Wall } from '../../../shared/models';
import { filter } from 'rxjs';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { WallService } from '../../../services/wallservice/wall.service';
import { UI_BASE_URL } from '../../../environment-config';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-download-wall',
  standalone: true,
  imports: [
    NgStyle,
    WallPostsComponent,
    TitleBarComponent
  ],
  templateUrl: './download-wall.component.html',
  styleUrl: './download-wall.component.css'
})
export class DownloadWallComponent implements OnInit{
  private readonly destroyRef = inject(DestroyRef);
  wallId: string = '';
  selectedBackground: string = '';
  
  constructor(
    private backgroundService:BackgroundImageService,
    private route: ActivatedRoute,
    private sharedService: SharedDataService,
    private router: Router,
    private wallService: WallService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      this.wallId = params['momentId'] ?? params['wallId'];
      this.fetchWallDetails(this.wallId);
    });
  }

  getAbsolutePath(relativePath: string): string {
    let baseUrl = UI_BASE_URL;
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    const finalUrl = baseUrl + relativePath.replace(/^\//, '');
    return finalUrl;
  }

  fetchWallDetails(wallId: string): void {
    this.sharedService.getWallDetails().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (wallData: Wall | null) => {
        if (wallData) {
          this.selectedBackground = this.getAbsolutePath(wallData.bgImg);
        } else {
          this.backgroundService.getSelectedBgSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((bg) => {
            this.selectedBackground = this.getAbsolutePath(bg);
          });
        }
      },
      error: (err) => {
        this.backgroundService.getSelectedBgSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((bg) => {
          this.selectedBackground = this.getAbsolutePath(bg);
        });
      },
    });
  }  
}
