import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class Notification {

  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }
}