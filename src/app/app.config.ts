import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { provideRouter, withRouterConfig, withViewTransitions } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { Directionality } from '@angular/cdk/bidi';

import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';

import { MatPaginatorIntl } from '@angular/material/paginator';
import { PaginatorIntl } from './core/services/paginator-intl';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { AppDirectionality } from './core/services/app-directionality';
import { DialogHistory } from './core/services/dialog-history';

export const appConfig: ApplicationConfig = {
  providers: [

    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,
      withViewTransitions(),

      // "Back" that is cancelled (e.g. "Stay" on the grades page's
      // "Leave without saving?"): the browser goes back to where it was,
      // so the step "Back" was going to is still there for the next "Back".
      // (The default, 'replace', overwrote that step with the current page.)
      withRouterConfig({ canceledNavigationResolution: 'computed' })
    ),

    provideHttpClient(withInterceptors([authInterceptor])),

    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './i18n/',
        suffix: '.json'
      })
    }),

    {
      provide: Directionality,
      useClass: AppDirectionality
    },

    {
      provide: MatPaginatorIntl,
      useClass: PaginatorIntl
    },

    // The browser's Back button closes the open dialog, not the page
    // (core/services/dialog-history.ts). The dialogs do not close on "Back"
    // by themselves, so that service decides. The rest stays the default.
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { ...new MatDialogConfig(), closeOnNavigation: false }
    },

    provideAppInitializer(() => inject(DialogHistory).start())

  ]
};