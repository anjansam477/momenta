import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { NgClass, TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { QuillEditorComponent, QuillModule } from 'ngx-quill';
import { PostService } from '../../services/postservice/post.service';
import { ToastrService } from 'ngx-toastr';
import { MediaService } from '../../services/mediaservice/media.service';
import { AuthService } from '../../services/authservice/auth.service';
import { filter, Subject } from 'rxjs';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { GifModalComponent } from '../gif-modal/gif-modal.component';
import { StickerModalComponent } from '../sticker-modal/sticker-modal.component';
import { enableGiphy } from '../../environment-config';
import { Post } from '../../models/post.model';
import { POST_AUTHOR_NAME_MAX_LENGTH, POST_CONTENT_MAX_LENGTH } from '../../shared/post/post.constants';
import { Wall } from '../../shared/models';
import { normalizePostAuthor } from '../../shared/post/post-author.util';
import { handleHttpError } from '../../utils/error-handler.util';
import { POST_STATUS } from '../../constants/wall.constants';

declare const bootstrap: {
  Modal: {
    new (el: Element, opts?: Record<string, unknown>): { show(): void; hide(): void; dispose(): void };
    getOrCreateInstance(el: Element): { show(): void; hide(): void; dispose(): void };
  }
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-postmodal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    QuillModule,
    HttpClientModule,
    PickerModule,
    NgClass,
    TitleCasePipe,
    ImageCropperComponent,
    GifModalComponent,
    StickerModalComponent
  ],
  templateUrl: './postmodal.component.html',
  styleUrl: './postmodal.component.css',
})
export class PostmodalComponent implements OnInit, AfterViewInit {
  @Input() postIdSubject: Subject<string> | undefined;
  @Output() modalClosed = new EventEmitter<void>();
  email: string| null = this.authService.getEmail();
  postId = '';
  selectedFile!: File | undefined;
  emojishow = false;
  postForm!: FormGroup;
  @ViewChild('editor', { static: false }) editorRef!: QuillEditorComponent;
  isAuthenticated = false;
  WallId = '';
  mediaUrl = '';
  mediaType = '';
  mediaPreviewUrl: string | ArrayBuffer | null = null;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('gifInput') gifInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;
  errorMessage = '';
  imageChangedEvent: Event | null = null;
  croppedImage: Blob | null = null;
  isCropped = false;
  initialCropArea: { x1: number, y1: number, x2: number, y2: number } | null = null;
  showGifModal = false;
  showStickerModal = false;
  editorContent = '';
  enableGiphy = enableGiphy;
  posts: Post[] = [];
  private readonly destroyRef = inject(DestroyRef);
  shareEmail = false;
  currentPostIndex = 0;
  nonArchivedNonReportedCount=0;
  nonArchivedCount=0;
  isSubmitting = false;
  readonly postContentMaxLength = POST_CONTENT_MAX_LENGTH;
  readonly postAuthorNameMaxLength = POST_AUTHOR_NAME_MAX_LENGTH;

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private toastr: ToastrService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private sharedService: SharedDataService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.WallId = params['momentId'] ?? params['wallId'];
    });
  
    this.isAuthenticated = this.authService.isAuthenticated();
    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(POST_CONTENT_MAX_LENGTH)]],
      firstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(POST_AUTHOR_NAME_MAX_LENGTH)]],
      lastName: ['', [Validators.maxLength(POST_AUTHOR_NAME_MAX_LENGTH)]],
    });

    if(this.isAuthenticated){
      this.fetchWallDetails();
       
      if (this.postIdSubject) {
        this.postIdSubject.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
          (postId: string) => {
            this.postId = postId;
            this.postService.getPost(this.WallId, postId).subscribe({
              next: (data) => {
              this.postForm.setValue({
                content: data.content,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
              });
  
              this.mediaUrl = data.mediaUrl || '';
              if (this.mediaUrl) {
                this.viewMedia(this.mediaUrl);
              }
            },
          error: (err) => handleHttpError(err, this.toastr)
          });
          }
        );
      }
  
      if (!this.postId) {
        const userName = this.authService.getName();
        if (userName) {
          const name = userName.trim().split(/\s+/);
          const firstname = name[0];
          const lastname = name.slice(1).join(' ');
          this.postForm.patchValue({
            firstName: firstname,
            lastName: lastname,
          });
        }
      }
      
      this.sharedService.getSendMail()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(sendEmail => {
          this.shareEmail = sendEmail;
          if(this.shareEmail){
            this.fetchPostsForUser();
          }
        });
    }
  }

  stopVideo(video: HTMLVideoElement) {
    video.pause();
  }

  isFormValid(): boolean {
    const author = this.getAuthorName();
    const firstName = author.firstName;
    const lastName = author.lastName;
    const content = this.postForm.get('content')?.value;
    const isFirstNameValid = firstName.length >= 3 && firstName.length <= 50;
    const isLastNameValid = lastName.length <= 50;
    const isContentPresent = !!content && !this.isContentEmpty();
    const isContentLengthValid = this.isContentLengthValid();
    const isMediaPresent = (this.mediaUrl !== '#' && this.mediaUrl !== '') ;
  
    const isNameValid = isFirstNameValid && isLastNameValid;
    const isContentOrMediaPresent = isContentPresent || isMediaPresent;
    const isValidForm = isNameValid && isContentOrMediaPresent && isContentLengthValid && !this.anyModalOpen() && !this.isSubmitting;
  
    return isValidForm;
  }

  private getAuthorName(): { firstName: string; lastName: string } {
    return normalizePostAuthor({
      isAuthenticated: this.isAuthenticated,
      formFirstName: this.postForm?.get('firstName')?.value,
      formLastName: this.postForm?.get('lastName')?.value,
      storedName: this.authService.getName(),
      email: this.email,
    });
  }

  private isContentLengthValid(): boolean {
    const content = this.postForm?.get('content')?.value ?? '';
    return String(content).length <= POST_CONTENT_MAX_LENGTH;
  }

  private isContentEmpty(): boolean {
    const editorContent = this.editorRef?.quillEditor?.root.innerHTML ?? this.postForm?.get('content')?.value ?? '';
    const textContent = editorContent.replace(/<(?!img)[^>]*>/g, '').trim();
    const containsImage = /<img[^>]*>/.test(editorContent);
    return textContent.length === 0 && !containsImage;
  }

  close() {
    this.postId = '';
    if (this.postForm.value.content) {
      this.postForm.patchValue({
        content: '',
      });
    }
    if (!this.isAuthenticated) {
      this.postForm.patchValue({
        firstName: '',
        lastName: ''
      });
    }
    this.errorMessage = '';
    this.isSubmitting = false;
    this.postForm.get('firstName')?.markAsPristine();
    this.postForm.get('firstName')?.markAsUntouched();
    this.postForm.get('lastName')?.markAsPristine();
    this.postForm.get('lastName')?.markAsUntouched();
    this.postForm.get('content')?.markAsPristine();
    this.postForm.get('content')?.markAsUntouched();
    this.removeMedia();
    this.checkForMediaRemoval();
    this.cancelCrop();
  }

  removeMedia() {
    this.selectedFile = undefined;
    this.mediaType = '';
    this.mediaPreviewUrl = '';
    this.mediaUrl = '';
    this.croppedImage = null;
    this.errorMessage = '';
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (wallData: Wall) => {
          this.nonArchivedCount = wallData.posts.nonArchivedCount,
          this.nonArchivedNonReportedCount =  wallData.posts.nonArchivedNonReportedCount
      },
      error: (err) => {
        console.error('Error fetching wall details', err);
      }
    });
  }

  fetchPostsForUser(){
    if(this.email){
      this.postService.getPostsForEmail(this.WallId, this.email).subscribe({
        next: (posts)=>{
          this.posts = posts;
          this.currentPostIndex = 0; 
          const data = this.posts[this.currentPostIndex];
          this.postId = data._id;
          this.postForm.setValue({
            content: data.content,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
          });
          if (data.mediaUrl && data.mediaUrl !== '#') {
            this.mediaUrl = data.mediaUrl || '';
            this.viewMedia(data.mediaUrl || '');
          }else{
            this.mediaUrl = ''
            this.mediaPreviewUrl = '';
           }
        },
        error: (err) => handleHttpError(err, this.toastr)
      })
    }
  }

  showPreviousPost() {
    if (this.currentPostIndex > 0) {
      this.currentPostIndex--;
      const data = this.posts[this.currentPostIndex];
      this.postId = data._id;
      this.postForm.setValue({
        content: data.content,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
      });
      if (data.mediaUrl && data.mediaUrl !== '#') {
        this.mediaUrl = data.mediaUrl || '';
        this.viewMedia(data.mediaUrl || '');
      }else{
        this.mediaUrl = ''
        this.mediaPreviewUrl = '';
      }
    }
  }

  showNextPost() {
    if (this.currentPostIndex < this.posts.length - 1) {
      this.currentPostIndex++;
      const data = this.posts[this.currentPostIndex];
      this.postId = data._id;
      this.postForm.setValue({
        content: data.content,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
      });
      if (data.mediaUrl && data.mediaUrl !== '#') {
        this.mediaUrl = data.mediaUrl || '';
        this.viewMedia(data.mediaUrl || '');
      }else{
        this.mediaUrl = ''
        this.mediaPreviewUrl = '';
      }
    }
  }

  openFileInputForEditing() {
    if (this.mediaType === 'image' && this.imageInput) {
      this.imageInput.nativeElement.value = '';
      this.imageInput.nativeElement.click();
    } else if (this.mediaType === 'gif' && this.gifInput) {
      this.gifInput.nativeElement.value = '';
      this.gifInput.nativeElement.click();
    } else if (this.mediaType === 'video' && this.videoInput) {
      this.videoInput.nativeElement.value = '';
      this.videoInput.nativeElement.click();
    }
  }

  addMedia(event: Event, mediaType: string) {
    this.errorMessage = '';
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files ? inputElement.files[0] : null;
    if (!file) {
      return;
    }
    if (this.selectedFile && this.selectedFile.name === file.name) {
      this.fileChangeEvent(event);
      setTimeout(()=>{
        inputElement.value = '';
      }) 
      return;
    }

    if(this.selectedFile){
      this.removeMedia();
    }
    if (this.mediaPreviewUrl || this.postForm?.get('content')?.value?.includes('<img src=')) {
      this.errorMessage = 'Only one media can be added in a post';
      inputElement.value = '';
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
      return;
    }
    const maxImageGifSize = 2 * 1024 * 1024;
    const maxVideoSize = 5 * 1024 * 1024;
    
    if (file.type.includes('video') && file.size <= maxVideoSize) {
      this.selectedFile = file;
      this.mediaType = mediaType;
    
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.mediaPreviewUrl = e.target?.result ?? null;
        this.mediaUrl = (e.target?.result as string) ?? '';
        inputElement.value = '';
      };
    
      reader.readAsDataURL(file);
    } else if ((file.type.includes('image') || file.type.includes('gif')) && file.size <= maxImageGifSize) {
      this.selectedFile = file;
      this.mediaType = mediaType;
    
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.mediaPreviewUrl = e.target?.result ?? null;
        this.mediaUrl = (e.target?.result as string) ?? '';
        inputElement.value = '';
      };
    
      reader.readAsDataURL(file);
      this.fileChangeEvent(event);
    } else {
      this.errorMessage = (file.type.includes('image') || file.type.includes('video') || file.type.includes('gif'))
        ? (file.type.includes('video') ? 'Video file size should be less than 5MB' : 'Media size should be less than 2MB')
        : 'Not a valid file type, it should be either image, video, or gif';
    }
  }

  triggerMediaInput(input: HTMLInputElement): void {
    this.closeAllModals();
    input.value = '';
    input.click();
  }

  getSelectedMediaLabel(): string {
    return this.selectedFile?.name || (this.mediaUrl && this.mediaUrl !== '#' ? 'Current media' : '');
  }

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
  }

  imageCropped(event: { blob?: Blob | null; cropperPosition?: { x1: number; y1: number; x2: number; y2: number } }): void {
    this.croppedImage = event.blob ?? null;
    if (event.cropperPosition) {
      this.isImageChanged(event as { cropperPosition: { x1: number; y1: number; x2: number; y2: number } });
    }
  }

  crop() {
    this.mediaPreviewUrl = this.croppedImage ? URL.createObjectURL(this.croppedImage) : null
    this.imageChangedEvent = null;
    this.initialCropArea = null;
    this.isCropped = false;
  }

  uploadWithoutCropping() {
    this.imageChangedEvent = null;
    this.croppedImage = null;
  }

  cancelCrop() {
    this.imageChangedEvent = null;
    this.croppedImage = null;
    this.isCropped = false;
  }

  isImageChanged(event: { cropperPosition: { x1: number; y1: number; x2: number; y2: number } }) {
    if (!this.initialCropArea) {
      this.initialCropArea = { x1: event.cropperPosition.x1, y1: event.cropperPosition.y1, x2: event.cropperPosition.x2, y2: event.cropperPosition.y2 };
    }
    else {
      const hasCropped = event.cropperPosition.x1 !== this.initialCropArea.x1 ||
        event.cropperPosition.y1 !== this.initialCropArea.y1 ||
        event.cropperPosition.x2 !== this.initialCropArea.x2 ||
        event.cropperPosition.y2 !== this.initialCropArea.y2;
      this.isCropped = hasCropped
    }
  }

  addEmoji(event: { emoji: { native: string } }) {
    const emoji = event.emoji.native;
    const quillEditor = this.editorRef?.quillEditor;

    if (quillEditor) {
      const range = quillEditor.getSelection(true);
      const cursorPosition = range ? range.index : 0;

      quillEditor.insertText(cursorPosition, emoji, 'user');

      quillEditor.setSelection(cursorPosition + emoji.length);

      this.postForm?.get('content')?.setValue(quillEditor.root.innerHTML);
      quillEditor.setSelection(cursorPosition + emoji.length, 0);
    }
  }

  toggleEmojiModal(event: MouseEvent) {
    event.stopPropagation();
    if (this.emojishow) {
      this.closeAllModals();
    } else {
      this.closeAllModals();
      this.emojishow = true;
    }
  }

  toggleGifModal(event: MouseEvent) {
    event.stopPropagation();
    if (this.showGifModal) {
      this.closeAllModals();
    } else {
      this.closeAllModals();
      this.showGifModal = true;
    }
  }

  toggleStickerModal(event: MouseEvent) {
    event.stopPropagation(); 
    if (this.showStickerModal) {
      this.closeAllModals();
    } else {
      this.closeAllModals();
      this.showStickerModal = true;
    }
  }

  closeAllModals() {
    this.emojishow = false;
    this.showGifModal = false;
    this.showStickerModal = false;
  }

  stopPropagation(event: MouseEvent) {
    event.stopPropagation(); 
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.closeAllModals(); 
  }

  insertGifIntoEditor(gifUrl: string) {
    if (this.mediaPreviewUrl || this.postForm?.get('content')?.value?.includes('<img src=')) {
      this.errorMessage = 'Only one media can be added in a post';
      setTimeout(() => { this.errorMessage = ''; }, 5000);
      return;
    }
    this.closeAllModals();
    const quill = this.editorRef.quillEditor;
    quill.focus();
    const range = quill.getSelection();
    const index = range ? range.index : Math.max(0, quill.getLength() - 1);
    quill.insertEmbed(index, 'image', gifUrl, 'user');
    quill.setSelection(index + 1, 0, 'silent');
    this.postForm?.get('content')?.setValue(quill.root.innerHTML);
  }

  insertStickerIntoEditor(stickerUrl: string) {
    if (this.mediaPreviewUrl || this.postForm?.get('content')?.value?.includes('<img src=')) {
      this.errorMessage = 'Only one media can be added in a post';
      setTimeout(() => { this.errorMessage = ''; }, 5000);
      return;
    }
    this.closeAllModals();
    const quill = this.editorRef.quillEditor;
    quill.focus();
    const range = quill.getSelection();
    const index = range ? range.index : Math.max(0, quill.getLength() - 1);
    quill.insertEmbed(index, 'image', stickerUrl, 'user');
    quill.setSelection(index + 1, 0, 'silent');
    this.postForm?.get('content')?.setValue(quill.root.innerHTML);
  }

  work(event?: Event) {
    event?.preventDefault();
    if (!this.isFormValid()) {
      this.postForm.markAllAsTouched();
      if (!this.isContentLengthValid()) {
        this.toastr.error(`Message should be ${POST_CONTENT_MAX_LENGTH} characters or less`);
      }
      return;
    }

    if (this.isAuthenticated && !this.postId) {
      const userName = this.authService.getName();
      if (userName) {
        const name = userName.trim().split(/\s+/);
        const firstname = name[0];
        const lastname = name.slice(1).join(' ');

        this.postForm.patchValue({
          firstName: firstname,
          lastName: lastname,
        });
      }
    }
    if (this.postId || this.shareEmail) {
      this.updatePost();
    } else {
      this.createPost();
    }
  }

  createPost() {
    let content = this.postForm?.get('content')?.value;
    const { firstName, lastName } = this.getAuthorName();
    const wallId = this.WallId;
    const file = this.croppedImage || this.selectedFile;

    if (!firstName || !lastName) {
      this.toastr.error('All fields are mandatory');
      return;
    }

    if (!this.isContentLengthValid()) {
      this.toastr.error(`Message should be ${POST_CONTENT_MAX_LENGTH} characters or less`);
      return;
    }

    content = content ?? '';
    const formData = new FormData();
    formData.append('content', content);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('wallId', wallId);
    if (file) {
      formData.append('file', file);
      formData.append('mediaType', this.mediaType);
    }
  
    if (content != '' || file) {
      this.isSubmitting = true;
      this.postService.createPost(this.WallId, formData).subscribe({
        next: (data) => {
          if (data.status === POST_STATUS.PENDING_APPROVAL) {
            this.toastr.info('Your post is pending approval by the wall owner', '', { timeOut: 5000 });
          } else {
            this.sharedService.setPost(data);
            this.sharedService.setPostAvailable(true);
            this.sharedService.setMyPost(true);
            this.sharedService.updateWallDetailsPartially({ posts: {
              nonArchivedCount: this.nonArchivedCount + 1,
              nonArchivedNonReportedCount: this.nonArchivedNonReportedCount + 1
            }});
          }
          this.modalClosed.emit();
          this.close();
          this.hideModal();
        },
        error: (err) => {
          this.isSubmitting = false;
          handleHttpError(err, this.toastr);
        }
      });
    }
  }

  updatePost(): void {
    const file = this.croppedImage || this.selectedFile;
    const { firstName, lastName } = this.getAuthorName();
    const updateModel: { content: string; firstName: string; lastName: string; mediaUrl?: string; mediaType?: string } = {
      content: this.postForm.get('content')?.value,
      firstName,
      lastName,
    };

    if (!this.isContentLengthValid()) {
      this.toastr.error(`Message should be ${POST_CONTENT_MAX_LENGTH} characters or less`);
      return;
    }

    this.isSubmitting = true;
    if (file) {
      this.mediaService.uploadFile(this.WallId, this.postId, file.type.split('/')[0], file as File).subscribe({
        next: (mediaData) => {
          updateModel.mediaUrl = mediaData.uploadedPath;
          updateModel.mediaType = file?.type.split('/')[0];

          this.postService.updatePost(this.WallId, this.postId, updateModel).subscribe({
            next: (data) => {
              this.onUpdateSuccess(data);
            },
            error: (err) => {
              this.isSubmitting = false;
              handleHttpError(err, this.toastr);
            }
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastr.error(err.error.message);
        }
      });
    }
    else {
      if (this.mediaUrl === '#' || this.mediaUrl === '') {
        updateModel.mediaUrl = '#';
        updateModel.mediaType = '';
      }

      this.postService.updatePost(this.WallId, this.postId, updateModel).subscribe({
        next: (data) => {
          this.onUpdateSuccess(data);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastr.error(err.error.message);
        }
      });
    }
  }

  onUpdateSuccess(post: Post): void {
    this.sharedService.setPost(post);
    this.close();
    this.sharedService.setMessage("update");
    this.modalClosed.emit();
    this.hideModal();
  }

  private hideModal(): void {
    const modalElement = document.getElementById('postModal');
    if (!modalElement || typeof bootstrap === 'undefined') {
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.hide();
  }

  viewMedia(mediaUrl: string): void {
    if (this.mediaUrl!=="#") {
      this.mediaService.retrieveFile(mediaUrl).subscribe((blob) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          this.mediaPreviewUrl = e.target?.result ?? null;

          const fileType = mediaUrl.split('.').pop()?.toUpperCase();
          if (fileType === 'MP4') {
            this.mediaType = 'video';
          } else if (fileType === 'GIF') {
            this.mediaType = 'gif';
          } else {
            this.mediaType = 'image';
          }
        };
        reader.readAsDataURL(blob);
      });
    }
  }

  anyModalOpen() {
    return this.emojishow || this.showGifModal || this.showStickerModal;
  }
  
  ngAfterViewInit() {
    setTimeout(() => {
      if(this.editorRef && this.editorRef.quillEditor){
        this.editorRef.quillEditor.on('text-change', () => {
          this.checkForMediaRemoval();
        });
      }  
    }, 500);
  }

  checkForMediaRemoval() {
    const quill = this.editorRef?.quillEditor;
    if (!quill) {
      return;
    }
    const editorContent = quill.root.innerHTML;
    if (!editorContent.includes('<img')) {
      this.errorMessage = '';
    }
  }
}
