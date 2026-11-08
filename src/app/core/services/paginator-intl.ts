import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class PaginatorIntl extends MatPaginatorIntl {

  // protected: RangePaginatorIntl (below) uses it too.
  protected readonly translate = inject(TranslateService);

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

    this.getRangeLabel = (page: number, pageSize: number, length: number) =>
      this.rangeLabel(page, pageSize, length);

    this.changes.next();
  }


  // "2 من 5": the page and the number of pages (the default of the app).
  protected rangeLabel(page: number, pageSize: number, length: number): string {

    const of = this.translate.instant('PAGINATOR.OF');

    if (length === 0 || pageSize === 0) {
      return `0 ${of} 0`;
    }

    const currentPage = page + 1;
    const totalPages = Math.ceil(length / pageSize);

    return `${currentPage} ${of} ${totalPages}`;
  }
}


// "11–20 من 531": the rows shown and the number of rows
// (spec: "الجداول" → الترقيم). Used by the students table:
//   providers: [{ provide: MatPaginatorIntl, useClass: RangePaginatorIntl }]
// Other lists can switch to it when their section is redesigned.
@Injectable()
export class RangePaginatorIntl extends PaginatorIntl {

  protected override rangeLabel(page: number, pageSize: number, length: number): string {

    const of = this.translate.instant('PAGINATOR.OF');

    if (length === 0 || pageSize === 0) {
      return `0 ${of} ${length}`;
    }

    const start = page * pageSize + 1;
    const end = Math.min(start + pageSize - 1, length);

    return `${start}–${end} ${of} ${length}`;
  }
}