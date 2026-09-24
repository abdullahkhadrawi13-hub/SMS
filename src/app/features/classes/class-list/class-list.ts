import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ClassForm } from '../class-form/class-form';

import { TranslatePipe } from '@ngx-translate/core';

import { SchoolClasses } from '../../../core/services/school-classes';
import { Sections } from '../../../core/services/sections';

import { SchoolClass } from '../school-class';
import { Section } from '../section';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatDialogModule,
    TranslatePipe
  ],
  templateUrl: './class-list.html',
  styleUrl: './class-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassList implements OnInit {

  private schoolClassesService = inject(SchoolClasses);
  private sectionsService = inject(Sections);
  private dialog = inject(MatDialog);

  protected readonly classes = signal<SchoolClass[]>([]);
  protected readonly sections = signal<Section[]>([]);

  protected readonly isLoading = signal(false);

  protected readonly displayedColumns = [
    'class',
    'section',
    'status',
    'actions'
  ];



  ngOnInit(): void {
    this.loadClasses();
  }

  private loadClasses(): void {
    this.isLoading.set(true);

    this.schoolClassesService
      .getClasses(1, 100)
      .subscribe({
        next: response => {
          this.classes.set(response.data.items);
          this.loadSections();
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  private loadSections(): void {
    const classes = this.classes();

    if (classes.length === 0) {
      this.isLoading.set(false);
      return;
    }

    const loadedSections: Section[] = [];
    let completedRequests = 0;

    classes.forEach(schoolClass => {

      this.sectionsService
        .getSectionsByClass(schoolClass.schoolClassId)
        .subscribe({
          next: response => {
            loadedSections.push(...response.data);
          },

          complete: () => {
            completedRequests++;

            if (completedRequests === classes.length) {
              this.sections.set(loadedSections);
              this.isLoading.set(false);
            }
          },

          error: () => {
            completedRequests++;

            if (completedRequests === classes.length) {
              this.sections.set(loadedSections);
              this.isLoading.set(false);
            }
          }
        });

    });
  }

  protected openAddClassDialog(): void {
   const dialogRef = this.dialog.open(ClassForm, {
    width: '520px',
    maxWidth: '90vw',
    panelClass: 'custom-dialog-container', // كلاس مخصص للحاوية
    autoFocus: false,
    data: {
      mode: 'add'
    }
  });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClasses();
      }
    });
  }

  protected openEditClassDialog(schoolClass: SchoolClass): void {
  const dialogRef = this.dialog.open(ClassForm, {
    width: '520px',
    maxWidth: '90vw',
    panelClass: 'custom-dialog-container',
    autoFocus: false,
    data: {
      mode: 'edit',
      schoolClass
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loadClasses();
    }
  });
}

}