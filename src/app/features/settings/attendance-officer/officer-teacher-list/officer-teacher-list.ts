import { Component, computed, input, output, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

import { TeacherListDto } from '../../../../core/services/teachers';

import { getTeacherName } from '../teacher-name';


@Component({
  selector: 'app-officer-teacher-list',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './officer-teacher-list.html',
  styleUrl: './officer-teacher-list.css',
})
export class OfficerTeacherList {

  // ===== Inputs (all data is owned and loaded by the parent page) =====

  // Active teachers the Admin can choose from.
  readonly teachers = input<TeacherListDto[]>([]);

  // ID of the current officer: his row is marked and cannot be selected.
  readonly officerId = input<number | null>(null);

  // ID of the teacher selected by the Admin (not saved yet).
  readonly selectedId = input<number | null>(null);

  // True while the parent page is saving: the rows cannot be clicked.
  readonly disabled = input(false);


  // ===== Output (the parent page keeps the selection and saves it) =====

  readonly selectTeacher = output<number>();


  // Current value of the search field.
  readonly search = signal('');

  // Teachers matching the search text.
  // The search is done here (no request): the teachers are already loaded.
  // It matches the Arabic name, the English name, the number and the phone.
  readonly filteredTeachers = computed(() => {

    const text = this.search().trim().toLowerCase();

    if (!text) {
      return this.teachers();
    }

    return this.teachers().filter(teacher => {

      const values = [
        `${teacher.firstNameAr} ${teacher.fatherNameAr} ${teacher.grandFatherNameAr} ${teacher.familyNameAr}`,
        `${teacher.firstNameEn} ${teacher.fatherNameEn} ${teacher.grandFatherNameEn} ${teacher.familyNameEn}`,
        teacher.teacherNumber,
        teacher.phoneNumber,
      ];

      return values.some(
        value => value.toLowerCase().includes(text)
      );
    });
  });


  // Clears the search field.
  clearSearch(): void {
    this.search.set('');
  }


  // Runs when a row is clicked.
  onSelect(teacher: TeacherListDto): void {

    // The current officer is already assigned: nothing to select.
    if (this.disabled() || teacher.teacherId === this.officerId()) {
      return;
    }

    this.selectTeacher.emit(teacher.teacherId);
  }


  // Returns the teacher name according to the current language.
  getTeacherName(teacher: TeacherListDto): string {
    return getTeacherName(teacher);
  }
}
