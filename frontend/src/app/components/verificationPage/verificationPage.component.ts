import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { APP_EMAIL } from '../../environment-config';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verificationPage',
  standalone: true,
  imports: [],
  templateUrl: './verificationPage.component.html',
  styleUrl: './verificationPage.component.css',
})
export class VerificationPageComponent implements OnInit {
  status='';
  userEmail='';
  constructor(private route: ActivatedRoute,private router: Router,private sharedService: SharedDataService) { }
  
 
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.status = params['status'];
    });
  }

  openGmail() {
    this.userEmail = this.sharedService.userEmail();
    if(this.userEmail){
      const url = `https://mail.google.com/mail/u/${this.userEmail}/#search/from:${APP_EMAIL}`;
      window.open(url, '_blank');
    }
    else{
      window.open('https://mail.google.com/', '_blank');
    }
    this.router.navigateByUrl('/login');
  }

  redirectToLogin(){
    this.router.navigateByUrl('/login');
  }
}
