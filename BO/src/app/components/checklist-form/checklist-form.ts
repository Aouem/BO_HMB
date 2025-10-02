import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CheckListService } from '../../services/check-list-service';
import { CheckListDto, CreateCheckListDto } from '../../models';

@Component({
  selector: 'app-checklist-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checklist-form.html',
  styleUrls: ['./checklist-form.css']
})
export class CheckListFormComponent implements OnInit {
   form: FormGroup;
  checklists: CheckListDto[] = [];
  loading = true;
  formSubmitted = false;
  submitting = false;
  selectedChecklist: CheckListDto | null = null;

  constructor(private fb: FormBuilder, private checklistService: CheckListService) {
    this.form = this.fb.group({
      libelle: ['', Validators.required],
      etapes: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadChecklists();

    // ➕ Ajouter une étape et une question vide au démarrage
    if (this.etapes.length === 0) {
      this.addEtape();
      this.addQuestion(0);
    }
  }

  // --- GETTERS ---
  get etapes(): FormArray {
    return this.form.get('etapes') as FormArray;
  }

  getQuestions(etapeIndex: number): FormArray {
    return this.etapes.at(etapeIndex).get('questions') as FormArray;
  }

  getOptions(etapeIndex: number, questionIndex: number): FormArray {
    return this.getQuestions(etapeIndex).at(questionIndex).get('options') as FormArray;
  }

  // --- LOAD CHECKLISTS ---
  loadChecklists(): void {
    this.checklistService.getAllCheckLists().subscribe({
      next: (data: CheckListDto[] | null) => {
        this.checklists = data?.filter(cl => cl != null) || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des checklists :', err);
        this.loading = false;
      }
    });
  }

  selectChecklist(cl: CheckListDto): void {
    this.selectedChecklist = cl;
  }

  clearSelection(): void {
    this.selectedChecklist = null;
  }

  // --- ETAPES ---
  addEtape(): void {
    const etape = this.fb.group({
      nom: ['', Validators.required],
      questions: this.fb.array([])
    });
    this.etapes.push(etape);
  }

  removeEtape(index: number): void {
    this.etapes.removeAt(index);
  }

  // --- QUESTIONS ---
  addQuestion(etapeIndex: number, type: string = 'Boolean'): void {
    const question = this.fb.group({
      texte: ['', Validators.required],
      type: [type, Validators.required],
      reponse: [''],
      options: this.fb.array([])
    });
    this.getQuestions(etapeIndex).push(question);
  }

  removeQuestion(etapeIndex: number, questionIndex: number): void {
    this.getQuestions(etapeIndex).removeAt(questionIndex);
  }

  // --- OPTIONS (Liste) ---
  addOption(etapeIndex: number, questionIndex: number): void {
    const option = this.fb.group({ valeur: [''] });
    this.getOptions(etapeIndex, questionIndex).push(option);
  }

  removeOption(etapeIndex: number, questionIndex: number, optionIndex: number): void {
    this.getOptions(etapeIndex, questionIndex).removeAt(optionIndex);
  }

  // --- TYPE BOOLEAN / BOOLEANNA ---
  getBooleanOptions(type: string): string[] {
    return type === 'BooleanNA' ? ['Oui', 'Non', 'N/A'] : ['Oui', 'Non'];
  }

  onTypeChange(etapeIndex: number, questionIndex: number): void {
    const question = this.getQuestions(etapeIndex).at(questionIndex) as FormGroup;

    // Reset options si ce n'est pas une liste
    if (question.get('type')?.value !== 'Liste') {
      question.setControl('options', this.fb.array([]));
    }

    // Reset la réponse
    question.patchValue({ reponse: '' });
  }

  // --- PRÉPARATION DES DONNÉES POUR L'ENVOI ---
  private prepareSubmitData(): CreateCheckListDto {
    const formValue = this.form.value;
    
    return {
      libelle: formValue.libelle,
      etapes: formValue.etapes.map((etape: any) => ({
        nom: etape.nom,
        questions: etape.questions.map((question: any) => ({
          texte: question.texte,
          type: question.type,
          options: question.options || []
        }))
      }))
    };
  }

  // --- SUBMIT CORRIGÉ ---
  onSubmit(): void {
    if (this.form.valid) {
      this.submitting = true;
      this.formSubmitted = true;

      const submitData = this.prepareSubmitData();
      console.log('Données envoyées au serveur:', submitData);

      // APPEL API DÉCOMMENTÉ ET CORRIGÉ
      this.checklistService.createCheckList(submitData).subscribe({
        next: (createdChecklist) => {
          console.log('Checklist créée avec succès:', createdChecklist);
          this.submitting = false;
          
          // Recharger la liste des checklists
          this.loadChecklists();
          
          // Réinitialiser le formulaire
          this.form.reset();
          this.etapes.clear();
          
          // Réajouter une étape et question vide
          this.addEtape();
          this.addQuestion(0);
          
          // Message de succès
          alert('Checklist créée avec succès!');
        },
        error: (err) => {
          console.error('Erreur lors de la création:', err);
          this.submitting = false;
          this.formSubmitted = false;
          
          // Message d'erreur
          alert('Erreur lors de la création de la checklist. Voir la console pour plus de détails.');
        }
      });
    } else {
      console.warn('Formulaire invalide', this.form.value);
      this.form.markAllAsTouched();
      
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.form);
    }
  }

  // Méthode utilitaire pour marquer tout le formulaire comme touché
  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
}