import { Component, DestroyRef, effect, EventEmitter, inject, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WallService } from '../../services/wallservice/wall.service';
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { AnimationService } from '../../services/animationservice/animation.service';
import { AudioService } from '../../services/audioservice/audio.service';
import { themes } from '../../constants/themes';
import { animations, MomentAnimation } from '../../constants/animations';
import { audios, MomentAudio } from '../../constants/audios';
import { Wall, WallTheme } from '../../shared/models';
import { BackgroundTheme } from '../../shared/models';
import { WALL_BG_COLORS, WALL_FONTS, WALL_TEXT_COLORS, WallBgColor, WallFont, WallTextColor } from '../../constants/wall-style.constants';
import { filter } from 'rxjs';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-background',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './background.component.html',
  styleUrl: './background.component.css'
})
export class BackgroundComponent implements OnInit{
  private readonly destroyRef = inject(DestroyRef);
  themes: BackgroundTheme[] = [];
  chooseTheme: string = 'All';
  occasion: string = '';
  activeTab: 'themes' | 'effects' | 'sounds' | 'colors' = 'themes';
  selectedImage: string = '';
  selectedAnimation: string = '';
  selectedAudio: string = '';
  themesList = themes;
  selectedTheme = 'All';
  selectedAudioTheme = 'All';
  showMoreBtn = true;
  initialThemeCount: number = 5;
  btnDisabled: boolean = false;
  currentBackgroundImage: string = '';
  wallDisplay: boolean = true;
  wallId: string = '';
  wall!: Wall;
  imageChanged: boolean = false;
  showAll: boolean = false;
  animations = animations;
  hoveredIndex: string = '';
  audioFiles = audios;
  filteredAudioFiles = this.audioFiles;
  hasAudio : boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  showText: boolean = false;
  hoveredGifSrc: { [key: string]: string } = {};

  // ── Colors & Fonts ──
  bgColors: WallBgColor[]   = WALL_BG_COLORS;
  wallFonts: WallFont[]     = WALL_FONTS;
  textColors: WallTextColor[] = WALL_TEXT_COLORS;
  selectedBgColor: string   = '';
  selectedFont: string      = '';
  selectedTextColor: string = '';
  customBgColor: string     = '#FFFFFF';
  colorsBtnDisabled: boolean = true;

  constructor(
    private wallService: WallService,
    private backgroundService: BackgroundImageService,
    private sharedService: SharedDataService,
    private animationService: AnimationService,
    private audioService: AudioService,
    private router: Router,
    private toastr: ToastrService
  ) { }


  ngOnInit(): void {
    this.themes = this.sharedService.themes();
    this.fetchWallDetails();
    this.audioService.getAudioFileSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(audioFile => {
      this.hasAudio = !!audioFile;
    });

  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (wallData: Wall) => {
          this.wall=wallData;
          this.wallId=wallData._id;
          this.occasion = wallData.type;
          this.currentBackgroundImage = wallData.bgImg;
          this.selectedImage = wallData.bgImg;
          this.shiftBg(this.selectedImage);
          this.selectedAudio = wallData.audio;
          this.shiftAudio(this.selectedAudio);
          this.selectedAnimation = wallData.animationId;
          this.shiftAnimation(this.selectedAnimation);
          this.btnDisabled = this.currentBackgroundImage === this.selectedImage && this.animationService.getSelectedAnimation() === this.selectedAnimation && this.audioService.getAudioFile() === this.selectedAudio;
          // Load color/font settings
          this.selectedBgColor   = wallData.theme?.bgColor   || '';
          this.selectedFont      = wallData.theme?.fontFamily || '';
          this.selectedTextColor = wallData.theme?.textColor  || '';
          this.colorsBtnDisabled = true;
          // Restore custom picker to saved color if it's not a preset
          const isPreset = WALL_BG_COLORS.some(c => c.value === this.selectedBgColor && c.value !== '');
          if (this.selectedBgColor && !isPreset) {
            this.customBgColor = this.selectedBgColor;
          }
      },
      error: (err)=>{
        this.router.navigateByUrl('error');
        return;
      }
    });
  }
  

  closeSidebar(): void {
    const bgImage = this.wall.bgImg;
    if (this.imageChanged == false) {
      this.backgroundService.setSelectedBackground(bgImage);
    }
    this.sharedService.clearStylePreview();
    this.closeModal.emit();
  }

  /**
   * Increases the inital set count of images to be shown in themes to show all images
   * @param none
   * @returns void
   */
  loadMoreImages() {
    this.initialThemeCount = this.themes.length;
    this.showMoreBtn = false;
  }

  /**
   * Sets the background of the view-wall page with the image the user has selected.
   * @param imageFileName
   * @returns void
   */
  setBg(imageFileName: string): void {
    const bgImagePath = imageFileName;
    this.backgroundService.setSelectedBackground(bgImagePath);
    this.selectedImage = imageFileName;
    this.imageChanged = false;
    // Preview image — temporarily clear bgColor so image is visible
    this.sharedService.setStylePreview({ bgColor: '', font: this.selectedFont, textColor: this.selectedTextColor });
    if (this.selectedAnimation == this.wall.animationId && this.selectedImage == this.wall.bgImg && this.selectedAudio === this.wall.audio)
      this.btnDisabled = true;
    else
      this.btnDisabled = false;
  }

  /**
   * Moves the applied image of the themes to the top of the list to make it easier for user to spot it.
   * @param imageFileName
   * @returns void
   */
  shiftBg(imageFileName: string) {
    const selectedTheme = this.themes.find((theme) =>
      theme.images.includes(imageFileName)
    );

    if (selectedTheme) {
      if (selectedTheme.name == 'Default') {
        const ocassionTheme = this.themes.find((theme) => this.replaceUnderscores(theme.name) == this.occasion);
        if (ocassionTheme) {
          const index1 = this.themes.indexOf(ocassionTheme);
          if (index1 !== -1) {
            this.themes.splice(index1, 1);
            this.themes.unshift(ocassionTheme);
          }
        }

        const index2 = this.themes.indexOf(selectedTheme);
        if (index2 !== -1) {
          this.themes.splice(index2, 1);
          this.themes.unshift(selectedTheme);
        }
      } else {
        const index = this.themes.indexOf(selectedTheme);
        if (index !== -1) {
          this.themes.splice(index, 1);
          this.themes.unshift(selectedTheme);
        }

        const imageIndex = selectedTheme.images.indexOf(imageFileName);
        if (imageIndex !== -1) {
          selectedTheme.images.splice(imageIndex, 1);
          selectedTheme.images.unshift(imageFileName);
        }
      }
    }
  }

  /**
   * Changes the value of the chooseTheme variable to reflect the theme user has selected
   * @param chosenTheme
   * @returns void
   */
  setTheme(chosenTheme: string) {
    this.chooseTheme = chosenTheme;
    this.loadMoreImages();
  }

  /**
   * Removes the underscores in the theme names and returns them.
   * @param Themename
   * @returns Theme name without the underscores
   */
  replaceUnderscores(Themename: string): string {
    return Themename.replace(/_/g, ' ');
  }

  /**
   * Sets the seleceted image as the background image of the wall. Sends the update service to update the image path.
   * @param none
   * @returns void
   */
  applyBackgroundImage(): void {
    if (this.wallId) {
      // Applying an image clears any solid bgColor so they don't conflict
      const themeUpdate = {
        ...(this.wall.theme || {}),
        bgImg: this.selectedImage,
        animationId: this.selectedAnimation,
        audio: this.selectedAudio,
        bgColor: '',
      };
      this.selectedBgColor = '';
      this.sharedService.clearStylePreview();
      this.wallService.updateWall(this.wallId, { bgImg: this.selectedImage, animationId: this.selectedAnimation, audio: this.selectedAudio, theme: themeUpdate })
        .subscribe({
          next: (updatedWall) => {
            this.wall = updatedWall;
            this.imageChanged = true;
            this.shiftBg(this.selectedImage);
            this.shiftAnimation(this.selectedAnimation);
            this.shiftAudio(this.selectedAudio);
            this.btnDisabled = true;
            this.changeAnimation(this.selectedAnimation);
            this.changeAudio(this.selectedAudio);
            this.closeSidebar();
        },
        error: (error) =>{
          this.toastr.error(error.error.message);
          this.closeSidebar();
        }
      });
    }
  }

  /**
   * Sets the animation of the view-wall page with the option the user has selected.
   * @param animationId
   * @returns void
   */
  selectAnimation(animationId: string): void {
    this.animationService.setSelectedAnimation(animationId);
    this.selectedAnimation = animationId;
    this.animationService.startAnimation(animationId);
    if (this.selectedAnimation == this.wall.animationId && this.selectedImage == this.wall.bgImg && this.selectedAudio === this.wall.audio)
      this.btnDisabled = true;
    else
      this.btnDisabled = false;
  }

  /**
   * Checks if the animation has changed 
   * @param animationId animation
   * @returns none
   */
  changeAnimation(animationId: string) {
    this.animationService.setSelectedAnimation(animationId);
    this.animationService.startAnimation(animationId);
  }


  /**
   * Moves the applied animation to the top of the list to make it easier for user to spot it.
   * @param animationId
   * @returns void
   */
  shiftAnimation(animationId: string) {
    const selectedAnimationIndex = this.animations.findIndex(animation => animation.id === animationId);
    if (selectedAnimationIndex !== -1) {
      const selectedAnimation = this.animations.splice(selectedAnimationIndex, 1)[0];
      this.animations.unshift(selectedAnimation);
    }
  }
  /**
   * Sets the hovered state of GIFs within the gifRows array. 
   * @param {any} gif - The GIF id to be marked as hovered. If null, all GIFs will be marked as not hovered.
   */
  setHoveredIndex(id: string): void {
    this.hoveredIndex = id;
  }

  /**
     * Sets the audio of the view-wall page with the option the user has selected.
     * @param file
     * @returns void
     */
  selectAudio(file: MomentAudio | string): void {
    const fileKey = typeof file === 'string' ? file : file.file;
    if(this.selectedAudio === fileKey && this.hasAudio ){
      this.audioService.stopAudio();
      return;
    }
    if (file === "")
      this.selectedAudio = '';
    else{
      this.selectedAudio = fileKey;
    }
    this.audioService.setAudioFile(file);
    this.audioService.playAudio(fileKey);
    if (this.selectedAnimation === this.wall.animationId && this.selectedImage === this.wall.bgImg && this.selectedAudio === this.wall.audio)
      this.btnDisabled = true;
    else
      this.btnDisabled = false;
  }


  /**
   * Checks if the audio has changed 
   * @param audio audio
   * @returns none
   */
  changeAudio(audio: string) {
    this.audioService.setAudioFile(audio);
    this.audioService.playAudio(audio);
    this.shiftAudio(audio);
  }


  /**
  * Moves the applied audio to the top of the list to make it easier for user to spot it.
  * @param audio
  * @returns void
  */
  shiftAudio(audio: string) {
    if (audio !== '') {
      // Update the filtered audio array
        const selectedIndex = this.filteredAudioFiles.findIndex(f => f.file === audio);
        if (selectedIndex !== -1) {
          const selectedFile = this.filteredAudioFiles.splice(selectedIndex, 1)[0];
          this.filteredAudioFiles.unshift(selectedFile);
        }
    } else {
      // No audio selected, prioritize audio files associated with the wall occasion
      const wallOccasionAudios = this.filteredAudioFiles.filter(file => file.theme === this.wall.type);
      wallOccasionAudios.forEach(audio => {
        const index = this.filteredAudioFiles.findIndex(file => file.file === audio.file);
        if (index !== -1) {
          this.filteredAudioFiles.splice(index, 1);
        }
      });
      wallOccasionAudios.forEach(audio => {
        this.filteredAudioFiles.unshift(audio);
      });
    }
  }
  

  onThemeChange(selectedTheme: string) {
    this.selectedAudioTheme = selectedTheme;
    if (selectedTheme === 'All') {
      this.filteredAudioFiles = this.audioFiles;
    } else {
      this.filteredAudioFiles = this.audioFiles.filter(file => file.theme === selectedTheme);
    }
    this.shiftAudio(this.selectedAudio);
  }

  resetGif(gif: MomentAnimation) {
    // Force reloading the gif by changing the src
    this.hoveredGifSrc[gif.id] = 'assets/animation/gifs/' + gif.path + '?t=' + new Date().getTime();
    this.setHoveredIndex(gif.id);
  }

  // ── Colors & Fonts ────────────────────────────────────────────

  selectBgColor(value: string): void {
    this.selectedBgColor = value === 'custom' ? this.customBgColor : value;
    this.colorsBtnDisabled = this.colorsUnchanged();
    this.sharedService.setStylePreview({ bgColor: this.selectedBgColor, font: this.selectedFont, textColor: this.selectedTextColor });
  }

  onCustomColorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.customBgColor = value;
    this.selectedBgColor = value;
    this.colorsBtnDisabled = this.colorsUnchanged();
    this.sharedService.setStylePreview({ bgColor: value, font: this.selectedFont, textColor: this.selectedTextColor });
  }

  selectFont(value: string): void {
    this.selectedFont = value;
    this.colorsBtnDisabled = this.colorsUnchanged();
    this.sharedService.setStylePreview({ bgColor: this.selectedBgColor, font: value, textColor: this.selectedTextColor });
  }

  selectTextColor(value: string): void {
    this.selectedTextColor = value;
    this.colorsBtnDisabled = this.colorsUnchanged();
    this.sharedService.setStylePreview({ bgColor: this.selectedBgColor, font: this.selectedFont, textColor: value });
  }

  private colorsUnchanged(): boolean {
    return this.selectedBgColor   === (this.wall?.theme?.bgColor   || '')
        && this.selectedFont      === (this.wall?.theme?.fontFamily || '')
        && this.selectedTextColor === (this.wall?.theme?.textColor  || '');
  }

  applyColors(): void {
    if (!this.wallId) return;
    const themeUpdate: WallTheme = {
      bgImg:       this.wall.theme?.bgImg       || this.wall.bgImg       || '',
      animationId: this.wall.theme?.animationId || this.wall.animationId || '',
      audio:       this.wall.theme?.audio       || this.wall.audio       || '',
      bgColor:     this.selectedBgColor,
      fontFamily:  this.selectedFont,
      textColor:   this.selectedTextColor,
    };
    this.wallService.updateWall(this.wallId, { theme: themeUpdate }).subscribe({
      next: (updatedWall) => {
        this.wall = updatedWall;
        this.colorsBtnDisabled = true;
        this.toastr.success('Style saved');
        this.sharedService.updateWallDetailsPartially({ theme: themeUpdate });
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Failed to save style'),
    });
  }

}
