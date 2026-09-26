import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TranslatePipe } from '@ngx-translate/core';

import { ClassForm, ClassFormData } from '../class-form/class-form';

@Component({
  selector: 'app-class-list',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatPaginatorModule,
    MatDialogModule,
    TranslatePipe
  ],
  templateUrl: './class-list.html',
  styleUrl: './class-list.css'
})
export class ClassList {

  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = [
    'className',
    'section',
    'studentCount',
    'status',
    'actions'
  ];


  openAddClassDialog(): void {
    this.dialog.open(ClassForm, {
      width: '500px',
      maxWidth: '95vw'
    });
  }

  openEditClassDialog(classItem: any): void {

  const data: ClassFormData = {
    mode: 'edit',
    classId: classItem.classId,
    sectionAr: classItem.sectionAr,
    sectionEn: classItem.sectionEn
  };

  this.dialog.open(ClassForm, {
    width: '500px',
    maxWidth: '95vw',
    data
  });

}

  

}