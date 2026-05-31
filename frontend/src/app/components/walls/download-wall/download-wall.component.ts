import { Component, OnInit } from '@angular/core';
import { WallPostsComponent } from '../wall-posts/wall-posts.component';
import { TitleBarComponent } from '../../../utils/title-bar/title-bar.component';
import { CommonModule } from '@angular/common';
import { BackgroundImageService } from '../../../services/backgroundimageservice/background-image.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { WallService } from '../../../services/wallservice/wall.service';
import { UI_BASE_URL } from '../../../environment-config';

@Component({
  selector: 'app-download-wall',
  standalone: true,
  imports: [
    WallPostsComponent,
    TitleBarComponent,
    CommonModule
  ],
  templateUrl: './download-wall.component.html',
  styleUrl: './download-wall.component.css'
})
export class DownloadWallComponent implements OnInit{
  wallId: string = '';
  selectedBackground: string = '';
  wallDetailsSubscription: Subscription | undefined;
  
  constructor(
    private backgroundService:BackgroundImageService,
    private route: ActivatedRoute,
    private sharedService: SharedDataService,
    private router: Router,
    private wallService: WallService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params: any) => {
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
    this.sharedService.getWallDetails().subscribe({
      next: (wallData: any) => {
        if (wallData) {
          this.selectedBackground = this.getAbsolutePath(wallData.bgImg);
        } else {
          this.backgroundService.getSelectedBgSubject().subscribe((bg) => {
            this.selectedBackground = this.getAbsolutePath(bg);
          });
        }
      },
      error: (err) => {
        console.error('Failed to fetch details, loading default background:', err);
        this.backgroundService.getSelectedBgSubject().subscribe((bg) => {
          this.selectedBackground = this.getAbsolutePath(bg);
        });
      },
    });
  }  
}
