import { Routes } from '@angular/router';
import { CheckListFormComponent } from './components/checklist-form/checklist-form';
import { CheckListListComponent } from './components/checklist-list/checklist-list';
import { CheckListDetailComponent } from './components/check-list-detail/check-list-detail';
import { ChecklistFormulaireComponent } from './components/checklist-formulaire/checklist-formulaire';

export const routes: Routes = [
  { path: 'checklists', component: CheckListListComponent, title: 'Checklists' },
  { path: 'checklists/new', component: CheckListFormComponent, title: 'Nouvelle checklist' },
  { path: 'formulaire', component: ChecklistFormulaireComponent, title: 'Formulaire checklist' },
  { path: 'checklists/:id', component: CheckListDetailComponent, title: 'Détail checklist' },

  { path: '', redirectTo: 'checklists', pathMatch: 'full' },
  { path: '**', redirectTo: 'checklists' }
];
