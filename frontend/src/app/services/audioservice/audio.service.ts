import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private audioFile: string = '';
  private audio = new Audio();
  private isMuted: boolean = false;

  // BehaviorSubject to track the current audio file and muteState
  private audioFileSubject = new BehaviorSubject<string>(this.audioFile);
  private muteStateSubject = new BehaviorSubject<boolean>(this.isMuted);

  constructor() {
    // Listen for the 'ended' event to reset the audio file
    this.audio.addEventListener('ended', () => {
      this.audioFile = '';
      this.setAudioFileSubject();
    });
  }

  /**
   * Getter method to access the current audio file
   * @returns audioFile
   */
  getAudioFile(): string {
    return this.audioFile;
  }

  /**
   * Method to get the audio file BehaviorSubject for subscription
   * @returns audioFileSubject
   */
  getAudioFileSubject() {
    return this.audioFileSubject;
  }

  /**
   * Method to update the BehaviorSubject with the current audio file
   */
  setAudioFileSubject() {
    this.audioFileSubject.next(this.audioFile);
  }

   /**
   * Setter method to update the current audio file
   */
   setAudioFile(audio:any) {
    this.audioFile = audio.file;
    if(this.isAudioMuted()){
      this.muteAudio();
    }
    this.setAudioFileSubject();
  }

   /**
   * Method to get the mute state BehaviorSubject for subscription
   * @returns muteStateSubject
   */
   getMuteStateSubject() {
    return this.muteStateSubject;
  }

  /**
   * Method to update the BehaviorSubject with the current mute state
   */
  setMuteStateSubject() {
    this.muteStateSubject.next(this.isMuted);
  }


  /**
   * Method to set and play a new audio file
   * @param file string
   */
  playAudio(file: string): void {
    if(this.isMuted){
      this.muteAudio();
    }
    
    this.audioFile = file;
    this.audio.src = `assets/audios/${file}`;
    this.audio.load();

    this.audio.loop = false;

    this.audio.onloadeddata = () => {
      this.audio.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    };
  
    this.setAudioFileSubject();
  }
  
  /**
   * Method to stop the current audio playback
   */
  stopAudio(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audioFile = '';
    this.setAudioFileSubject();
  }

   /**
   * Method to mute or unmute the audio
   */
   muteAudio(): void {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    this.setMuteStateSubject();
  }

  /**
   * Method to get the current mute state
   * @returns isMuted
   */
  isAudioMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Method to check if audio is currently playing
   * @returns boolean
   */
  isAudioPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0;
  }

  /**
   * Method to pause the current audio playback
   */
  pauseAudio(): void {
    this.audio.pause();
    this.setAudioFileSubject();
  }

  /**
   * Method to resume the current audio playback
   */
  resumeAudio(): void {
    if (this.audio.paused && this.audio.currentTime > 0 && !this.audio.ended) {
      this.audio.play().catch(error => {
        console.error("Error resuming audio:", error);
      });
    }
  }

  playAudioInLoop(file: string): void {
    this.stopAudio();
  
    this.audioFile = file;
    this.audio.src = `assets/audios/${file}`;
    this.audio.load();
  
    this.audio.onloadeddata = () => {
      this.audio.loop = true;
      this.audio.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    };
  
    this.setAudioFileSubject();
  }
  
}
