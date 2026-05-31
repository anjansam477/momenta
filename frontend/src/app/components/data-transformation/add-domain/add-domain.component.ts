import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { TagInputModule } from 'ngx-chips';
import { Observable, of } from 'rxjs';

type TagModel = string | Record<string, any>;

@Component({
  selector: 'app-add-domain',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagInputModule],
  templateUrl: './add-domain.component.html',
  styleUrl: './add-domain.component.css',
  animations: [
    trigger('fadeInAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('300ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AddDomainComponent {
  @Output() domainsChanged = new EventEmitter<string[]>();
  @Input() component!: string;
  @Input() sharedDomains: string[] = [];
  errorMessage: string[] = [];
  selectedDomains:string[]=[];
  searchResults:string[]=[];
  showListTitle:string[]=[];
  @Input() isDisabled: boolean=false;
  searchForm!: FormGroup;
  domainValidator = this.domainValidatorfun();
  splitPattern = new RegExp('[,\\s]+');
  commonDomains: Set<string> = new Set([
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'rediffmail.com'
  ]);
  showList = true;
  @Input() excludeDomains: string[] = [];
  info:string="";

  constructor(
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      search: [''],
      domainSearch: ''
    });
    this.selectedDomains = [...this.sharedDomains];
    this.searchResults = this.selectedDomains.sort();
    this.searchForm.get('domainSearch')?.valueChanges.subscribe(query => {
      this.searchPara(query);
    });
    this.setContent();
  }

  onAdding(tag: TagModel): Observable<TagModel> {
    let cleanedValue="";
    if (typeof tag === 'string') {
      cleanedValue = tag.startsWith('@') ? tag.substring(1).toLowerCase() : tag.toLowerCase();
    } else if (typeof tag === 'object' && tag !== null) {
      cleanedValue = tag['display'].startsWith('@') ? tag['display'].substring(1).toLowerCase() : tag['display'].toLowerCase();
    } else {
      return of("")
    }
    tag={"display":cleanedValue,"value":cleanedValue}
    return of(tag);
  }

  domainValidatorfun(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const domain = control.value.startsWith('@') ? control.value.substring(1).toLowerCase() : control.value.toLowerCase();
      const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const valid = domainPattern.test(domain);
      return valid ? null : { invalidDomain: { value: domain } };
    };
  }

  onAdd() {
    if (!this.searchForm.get('search')?.value) {
      return;
    }
    const invalidDomains: any[]=[];
    this.searchForm.get('search')?.value.forEach((domain: any) => {
      if (!this.selectedDomains.includes(domain.value) && this.addDomain(domain.value)) {
        this.selectedDomains.push(domain.value);
        this.searchResults=this.selectedDomains;
      }
      else{
        invalidDomains.push(domain);
        switch(this.component){
          case 'viewByDomain':  this.errorMessage[0]="Already have view access, or higher level of access or";
                                this.errorMessage[1]="may be a generic domain."
                              break;
          case 'postByDomain':  this.errorMessage[0]="Already have post access, or higher level of access or";
                                this.errorMessage[1]="may be a generic domain."
                              break;
        }
        
      }
    })
    this.domainsChanged.emit(this.selectedDomains);
    this.searchForm.get('search')?.setValue(invalidDomains);
  }

  addDomain(domain: string) {
    if (this.commonDomains.has(domain.toLowerCase())) {
      return false;
    }
    else if(this.excludeDomains.includes(domain)){
      return false;
    }
    return true;
  }

  toggleDisplay(): void {
    this.showList = !this.showList;
  }

  removeDomain(domain: any): void {
    this.selectedDomains = this.selectedDomains.filter(selectedDomain => selectedDomain !== domain);
    this.searchResults = this.searchResults.filter(selectedDomain => selectedDomain !== domain);
    this.domainsChanged.emit(this.selectedDomains);
  }


  searchPara(query: string): void {
    if (!query) {
      this.searchResults = this.selectedDomains;
      return;
    }
    const lowerCaseQuery = query.toLowerCase();

    this.searchResults = this.selectedDomains.filter(domain =>
      domain.toLowerCase().includes(lowerCaseQuery)
    );
  }

  setContent(){
    switch(this.component){
      case 'viewByDomain':  
                          this.info="Add organization to give view accesss";
                          this.showListTitle[0]="1 Organization has view access";
                          this.showListTitle[1]=" Organizations have view access";
                          break;
      case 'postByDomain': 
                          this.info="Add organization to give post accesss";
                          this.showListTitle[0]="1 Organization has post access";
                          this.showListTitle[1]=" Organizations have post access";
                          break;
    }
  }

  clear(){
    this.searchForm.get('search')?.setValue([]);
    this.errorMessage=[];
  }

  clearError(event: any) {
    if(this.errorMessage)
      this.errorMessage=[];
  }

  removeAllDomains()
  {
    this.selectedDomains=[];
    this.domainsChanged.emit(this.selectedDomains);
  }
}
