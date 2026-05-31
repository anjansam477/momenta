import { Injectable } from '@angular/core';
import Confetti, { Shape } from 'canvas-confetti';
import { animations } from '../../constants/animation-configuration';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnimationService {

  private interval: any;
  private timeout: any;

  constructor() {
  }

  selectedAnimation: string = '';
  selectedAnimationSubject = new BehaviorSubject(this.selectedAnimation);

  getSelectedAnimation(): string {
    return this.selectedAnimation;
  }

  getSelectedAnimationSubject() {
    return this.selectedAnimationSubject;
  }

  setSelectedAnimationSubject() {
    this.selectedAnimationSubject.next(this.selectedAnimation);
  }

  setSelectedAnimation(animationId: string): void {
    this.selectedAnimation = animationId;
    this.setSelectedAnimationSubject();
  }

  calculateScalarAndVelocity() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const baseWidth = 1920;
    const baseHeight = 1080;
    const scalar = Math.max(0.5, Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight));
    const velocity = Math.max(0.5,viewportHeight / baseHeight);
    return { scalar, velocity };
  }

  adjustConfettiData(confettiData: any) {
    const viewportWidth = window.innerWidth;
    const { scalar, velocity } = this.calculateScalarAndVelocity();

    if (viewportWidth <= 768) {
      // Mobile configuration
      return confettiData.map((confetti: any) => {
        const adjustedConfetti = {
          ...confetti,
          startVelocity: confetti.startVelocity? confetti.startVelocity * velocity*0.8 : undefined,
        };
        adjustedConfetti.particleCount = Math.ceil(confetti.particleCount * scalar) * 1.5;
        if ('scalar' in confetti) {
          adjustedConfetti.scalar = Math.max(0.5, confetti.scalar * scalar);
        } else {
          adjustedConfetti.scalar = 0.8;
        }
        return adjustedConfetti;
      });
    } else if (viewportWidth > 768 && viewportWidth <= 1024) {
      // Tablet configuration
      return confettiData.map((confetti: any) => {
        const adjustedConfetti = {
          ...confetti,
          startVelocity: confetti.startVelocity ? confetti.startVelocity * velocity* 1.2 : undefined,
        };
        adjustedConfetti.particleCount = Math.ceil(confetti.particleCount * scalar) * 2;
        if ('scalar' in confetti) {
          adjustedConfetti.scalar = Math.max(0.8, confetti.scalar * scalar)*1.2;
        } else {
          adjustedConfetti.scalar = 1;
        }
        return adjustedConfetti;
      });
    } else {
      // Desktop configuration (no change)
      return confettiData;
    }
  }
 

  triggerConfetti(animation: { id?: string; duration: number; interval?: number; confettiData: any; }) {
    const functionLookup: { [key: string]: () => number } = {
      random: () => Math.random(),
      increment: this.createStepper(0, 0.15),
      decrement: this.createStepper(1, -0.15),
      addLocationX: this.createStepper(-0.1, 0.3),
      addLocationX2: this.createStepper(-0.1, 0.3),


    };

    clearInterval(this.interval);
    clearTimeout(this.timeout);

    let adjustedConfettiData = this.adjustConfettiData(animation.confettiData);
    const onResize = () => {
      adjustedConfettiData = this.adjustConfettiData(animation.confettiData);
    };

    window.addEventListener('resize', onResize);

    this.interval = setInterval(() => {
      adjustedConfettiData.forEach((confetti: Confetti.Options | undefined) => {
        if (!confetti) return;
        let originX = confetti?.origin?.x;
        let originY = confetti?.origin?.y;

        if (typeof originX === 'string') {
          originX = functionLookup[originX]?.();
        }
        if (typeof originY === 'string') {
          originY = functionLookup[originY]?.();
        }

        const shapes = (confetti.shapes || []).map((shape: string | Confetti.PathShape | Confetti.BitmapShape) => {
          if (typeof shape === 'string' && !['circle', 'square', 'star'].includes(shape.toLowerCase())) {
            return Confetti.shapeFromText({ text: shape, scalar: confetti.scalar });
          }
          return shape;
        }) as Shape[];

        if (shapes.length) {
          Confetti({
            ...confetti,
            origin: { x: originX, y: originY },
            shapes: shapes
          });
        } else {
          Confetti({
            ...confetti,
            origin: { x: originX, y: originY }
          });
        }
      });
    }, animation.interval);

    this.timeout = setTimeout(() => {
      clearInterval(this.interval);
      window.removeEventListener('resize', onResize);
    }, animation.duration);
  }

  createStepper(initialValue: number, step: number) {
    let value = initialValue;
    return () => {
      value += step;
      return value;
    };
  }

  startAnimation(id: string): void {
    this.stopAnimation();
    const config = animations.find((config: { id: string }) => config.id === id);
    if (config) {
      this.triggerConfetti(config);
    }
  }

  stopAnimation(): void {
    clearInterval(this.interval);
    clearTimeout(this.timeout);
    this.selectedAnimation='';
  }

}
