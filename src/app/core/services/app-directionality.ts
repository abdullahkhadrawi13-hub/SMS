import { EventEmitter, Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { Directionality, Direction } from '@angular/cdk/bidi';
import { Language } from './language';

@Injectable()
export class AppDirectionality implements Directionality {

  private readonly language = inject(Language);

  // Must be WritableSignal to satisfy the Directionality base type
  readonly valueSignal: WritableSignal<Direction> = signal(
    this.language.currentDirection()
  );

  // Observable-based API kept for compatibility with components
  // that still subscribe to `change`
  readonly change = new EventEmitter<Direction>();

  get value(): Direction {
    return this.valueSignal();
  }

  constructor() {
    effect(() => {
      const dir = this.language.currentDirection();

      this.valueSignal.set(dir);
      this.change.emit(dir);
    });
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}