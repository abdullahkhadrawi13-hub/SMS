import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { Permissions } from '../../../core/services/permissions';

import { SUBJECTS_TABS, SubjectsTab } from '../subject';
import { SubjectsSelection } from '../subjects-selection';
import { SubjectsHeader } from '../subjects-header/subjects-header';
import { PlansTab } from '../subject-plans/plans-tab/plans-tab';
import { SubjectAssignmentsTab } from '../subject-assignments/subject-assignments-tab/subject-assignments-tab';
import { SubjectsListTab } from '../subjects-list/subjects-list-tab/subjects-list-tab';


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
    PlansTab,
    SubjectAssignmentsTab,
    SubjectsListTab,
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
  private readonly plansTab = viewChild(PlansTab);
  private readonly subjectsListTab = viewChild(SubjectsListTab);


  constructor() {

    // Keep the address up to date (replaceUrl: no new history entry per click).
    // It starts after the lists are loaded, so the term and class from the
    // address are not cleared while the page is still loading.
    effect(() => {

      if (!this.selection.isReady()) {
        return;
      }

      const queryParams = {
        tab: this.activeTab(),
        termId: this.selection.termId(),
        classId: this.selection.classId(),
      };

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        replaceUrl: true,
      });
    });
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
    this.subjectsListTab()?.openAddSubject();
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
