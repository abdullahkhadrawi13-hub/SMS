import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class PaginatorIntl extends MatPaginatorIntl {

  private translate = inject(TranslateService);

  constructor() {
    super();

    this.translate.onLangChange.subscribe(() => {
      this.translateLabels();
    });

    this.translateLabels();
  }

  private translateLabels(): void {

    this.itemsPerPageLabel =
      this.translate.instant('PAGINATOR.ITEMS_PER_PAGE');

    this.nextPageLabel =
      this.translate.instant('PAGINATOR.NEXT_PAGE');

    this.previousPageLabel =
      this.translate.instant('PAGINATOR.PREVIOUS_PAGE');

    this.firstPageLabel =
      this.translate.instant('PAGINATOR.FIRST_PAGE');

    this.lastPageLabel =
      this.translate.instant('PAGINATOR.LAST_PAGE');

    this.getRangeLabel = (
      page: number,
      pageSize: number,
      length: number
    ): string => {

      if (length === 0 || pageSize === 0) {
        return `0 ${this.translate.instant('PAGINATOR.OF')} ${length}`;
      }

      const startIndex = page * pageSize;
      const endIndex = Math.min(
        startIndex + pageSize,
        length
      );

      return `${startIndex + 1} – ${endIndex} ${this.translate.instant('PAGINATOR.OF')} ${length}`;
    };

    this.changes.next();
  }
}