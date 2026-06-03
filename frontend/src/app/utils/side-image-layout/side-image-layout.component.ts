import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-side-image-layout',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './side-image-layout.component.html',
  styleUrl: './side-image-layout.component.css'
})
export class SideImageLayoutComponent {


}
