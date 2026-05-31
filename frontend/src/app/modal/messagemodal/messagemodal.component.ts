import { Component, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-messagemodal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messagemodal.component.html',
  styleUrl: './messagemodal.component.css'
})
export class MessagemodalComponent{
  message: string = '';
  @ViewChild('messageModal') messageModal: any;
  currentPage : string = ''

  constructor(
    private sharedService: SharedDataService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(){
    this.route.url.subscribe((urlSegments) => {
      this.currentPage = urlSegments[0].path;
    });    
  }

  openModal(): void {
    const context = this.sharedService.message();
    this.message = this.getMessage(context);
  
    if (this.message !== '') {
      this.openMessageModal();
    }
  }

  closeModal(){
    if (this.messageModal) {
      const modalElement: HTMLElement = this.messageModal.nativeElement;
      modalElement.style.display = 'none';
      this.sharedService.setMessage('');
      modalElement.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  private openMessageModal(): void {
    if (this.messageModal) {
      this.messageModal.nativeElement.classList.add('show');
      this.messageModal.nativeElement.style.display = 'block';
      document.body.classList.add('modal-open');    
    }
    
    setTimeout(()=>{
      this.closeModal()
    },3500)
  }

  private getMessage(message: string): string{
    switch(message){
      case 'login': 
        return "Hey, welcome to the website, hope you enjoy it.";
      case 'logout': 
        return "We will see you again soon";
      case 'add': 
        return "You added a new post";
      case 'update': 
        return "You updated a post";
      case 'report' : 
        return "You reported a post";
      case 'un-report' : 
        return "You un-reported a post";
      case 'delete' : 
        return "You deleted a post";
      case 'need-login': 
        return "You need to login";
      case 'archive':
        return "The moment is archived";
        case 'un-archive': 
        return "The moment is un-archived";
      case 'star': 
        return "The moment is starred";
      case 'un-star': 
        return "The moment is un-starred";
      case 'password' : 
        return "You have updated your password";
      case 'wall' : 
        return "You added a new moment";
      case 'profile' : 
        return "You have successfully updated your user profile";
      case 'background': 
        return "You have updated your background effects. Enjoy the new thrill";
      case 'mail':
        return "Your mail has been scheduled";
      case 'lock' : 
      return "Moment is now locked, posts cannot be added";
      case 'unlock' : 
      return "Moment is unlocked, posts can be added now";
      case 'date':
        return "The expiry or scheduled dates has been updated";
      case 'login-modal':
        return "You have now logged in, you can enjoy the services provided";
      case 'verify':
        return "Verification mail has been sent, you can check your mail";
      default:
        return "";
    }
  }

}
