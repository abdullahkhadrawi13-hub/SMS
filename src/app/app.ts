import { Component, inject } from '@angular/core';
import { Language } from './core/services/language';
import { Theme } from './core/services/theme';
import { RouterOutlet } from '@angular/router';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private language = inject(Language);

  // Created at start (like Language), so data-theme is on <html>
  // on every page, the login pages too.
  private theme = inject(Theme);

  
}
