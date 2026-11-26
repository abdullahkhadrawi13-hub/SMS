import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { Permissions } from '../../../core/services/permissions';

import { SUBJECTS_TABS, SubjectsTab } from '../shared/subjects-shared';
import { SubjectsSelection } from '../shared/subjects-selection';
import { SubjectsHeader } from '../subjects-header/subjects-header';
import { SubjectPlansTab } from '../subject-plans/subject-plans-tab/subject-plans-tab';
import { SubjectAssignmentsTab } from '../subject-assignments/subject-assignments-tab/subject-assignments-tab';
import { SubjectsCatalogTab } from '../subjects-catalog/subjects-catalog-tab/subjects-catalog-tab';


// The subtitle under the page title, for each tab.
const TAB_SUBTITLES: Record<SubjectsTab, string> = {
  plans: 'SUBJECTS.HEADER.SUBTITLE_PLANS',
  assignments: 'SUBJECTS.HEADER.SUBTITLE_ASSIGNMENTS',
  catalog: 'SUBJECTS.HEADER.SUBTITLE_CATALOG',
};


// The Subjects page (Admin and Assistant Principal), three tabs:
//   1. Subject plans: components, weights and passing mark per class (section 9)
//   2. Subject assignments: each section's subjects and teachers (section 8)
//   3. Subjects list: the general list of school subjects (section 6)
//
// The chosen term and class are shared by the first two tabs (SubjectsSelection).
// The open tab, the term and the class are kept in the address:
//   /subjects?tab=plans&termId=3&classId=1
// so a link can open the page on them (e.g. "back" from a plan's page).
@Component({
  selector: 'app-subjects-page',
  imports: [
    SubjectsHeader,
    SubjectPlansTab,
    SubjectAssignmentsTab,
    SubjectsCatalogTab,
    MatIconModule,
    MatTabsModule,
    TranslatePipe,
  ],
  providers: [SubjectsSelection],
  templateUrl: './subjects-page.html',
  styleUrl: './subjects-page.css',
})
export class SubjectsPage implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Says what the current user is allowed to do.
  private readonly permissions = inject(Permissions);

  // The term and class shared by the plans and assignments tabs.
  readonly selection = inject(SubjectsSelection);

  // Only the Admin can add, edit, activate or deactivate
  // subjects, plans and the subjects of a section.
  // The Assistant Principal can only read.
  readonly canManage = this.permissions.canManageSubjects;

  // The open tab. The three tabs stay alive while switching,
  // so what was chosen in each one is not lost.
  readonly activeTab = signal<SubjectsTab>('plans');

  readonly subtitleKey = computed(() => TAB_SUBTITLES[this.activeTab()]);

  // The tabs the header buttons talk to.
  private readonly plansTab = viewChild(SubjectPlansTab);
  readonly assignmentsTab = viewChild(SubjectAssignmentsTab);
  private readonly subjectsCatalogTab = viewChild(SubjectsCatalogTab);


  constructor() {

    // Keep the address up to date. It starts after the lists are loaded,
    // so the term and class from the address are not cleared while the
    // page is still loading.
    //   - the first time it only fixes the address the page opened with
    //     (no new step for the browser's "Back")
    //   - after that, every tab, term or class the user picks is a new step,
    //     so "Back" goes back to the previous one (syncWithUrl() shows it)
    effect(() => {

      if (!this.selection.isReady()) {
        return;
      }

      const urlTree = this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: {
          tab: this.activeTab(),
          termId: this.selection.termId(),
          classId: this.selection.classId(),
        },
      });

      // Already the address (e.g. after "Back"): nothing to write.
      if (this.router.serializeUrl(urlTree) !== this.router.url) {
        this.router.navigateByUrl(urlTree, { replaceUrl: !this.wroteUrl });
      }

      this.wroteUrl = true;
    });

    // "Back" / "Forward": the tab, term and class of that step.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => this.syncWithUrl(params));
  }


  // The address was written once (see the effect in the constructor).
  private wroteUrl = false;


  // Shows the tab, term and class of the address, once the lists are
  // loaded (before that, ngOnInit() passes them to selection.load()).
  private syncWithUrl(params: ParamMap): void {

    if (!this.selection.isReady()) {
      return;
    }

    const tab = params.get('tab') as SubjectsTab | null;

    this.activeTab.set(tab && SUBJECTS_TABS.includes(tab) ? tab : 'plans');

    const termId = this.readId(params.get('termId'));

    if (this.selection.terms().some(t => t.academicTermId === termId)) {
      this.selection.selectTerm(termId!);
    }

    const classId = this.readId(params.get('classId'));

    if (classId !== null && this.selection.classes().some(c => c.schoolClassId === classId)) {
      this.selection.selectClass(classId);
    } else {
      this.selection.classId.set(null);
    }
  }


  ngOnInit(): void {

    const params = this.route.snapshot.queryParamMap;

    const tab = params.get('tab') as SubjectsTab | null;

    if (tab && SUBJECTS_TABS.includes(tab)) {
      this.activeTab.set(tab);
    }

    this.selection.load(
      this.readId(params.get('termId')),
      this.readId(params.get('classId'))
    );
  }


  selectTab(tab: SubjectsTab): void {
    this.activeTab.set(tab);
  }


  // Header "Add subject" button (subjects list tab only).
  openAddSubject(): void {
    this.subjectsCatalogTab()?.openAddSubject();
  }

  // Header "Add subject to section" button (assignments tab only).
  openAddAssignment(): void {
    this.assignmentsTab()?.openAddAssignment();
  }

  // Header "New plan" button (plans tab only).
  openAddPlan(): void {
    this.plansTab()?.openCreatePlan();
  }

  // Header "Copy from an earlier term" button (plans tab only).
  openCopyPlans(): void {
    this.plansTab()?.openCopy();
  }


  // "Create the plan first" in the assignments tab's add form:
  // the plans tab opens (same term and class) with its "New plan" form.
  createPlanFromAssignments(subjectId: number | null): void {
    this.activeTab.set('plans');
    this.plansTab()?.openCreatePlan(subjectId);
  }


  // A positive whole number from the address, or null.
  private readId(value: string | null): number | null {

    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
