import { Component , ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-blocked',
  standalone: true,
  imports: [],
  templateUrl: './blocked.component.html',
  styleUrl: './blocked.component.css'
})
export class BlockedComponent {

}
