import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormService } from '../../services/form-service';
import { CheckListService } from '../../services/check-list-service';
import { CheckListDto, EtapeDto, QuestionDto, FormResponseDto, QuestionResponseDto, FormSubmissionDto } from '../../models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checklist-formulaire',
  templateUrl: './checklist-formulaire.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./checklist-formulaire.css']
})
export class ChecklistFormulaireComponent implements OnInit {
  // Nouveaux états pour la sélection de checklist
  allChecklists: CheckListDto[] = [];
  selectedChecklist: CheckListDto | null = null;
  showChecklistSelection: boolean = true;

  // États existants
  checklistId: number = 0;
  currentUser: string = '';
  checklistNom: string = '';
  etapes: EtapeDto[] = [];
  form!: FormGroup;
  loading: boolean = false;

  // NAV question-par-question
  currentEtapeIndex: number = 0;
  currentQuestionIndex: number = 0;

  // état
  submitted: boolean = false;
  reponsesPartielles: QuestionResponseDto[] = [];
  etapesValidees: boolean[] = [];

  // affichage
  mode: 'etape' | 'question' = 'etape';
  autoAdvance: boolean = true;

  constructor(
    private formService: FormService,
    private checkListService: CheckListService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      libelle: ['', Validators.required],
      etapes: this.fb.array([])
    });

    this.loadCurrentUser();
    this.loadAllChecklists();
  }

  // === NOUVELLES MÉTHODES POUR LA SÉLECTION DE CHECKLIST ===

  loadAllChecklists(): void {
    this.loading = true;
    this.checkListService.getAllCheckLists().subscribe({
      next: (checklists: CheckListDto[]) => {
        this.allChecklists = checklists;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement des checklists:', err);
        this.loading = false;
        alert('Erreur lors du chargement des checklists.');
      }
    });
  }

  selectChecklist(checklist: CheckListDto): void {
    this.selectedChecklist = checklist;
    this.checklistId = checklist.id;
    this.checklistNom = checklist.libelle;
    this.showChecklistSelection = false;
    this.loadChecklist();
  }

  backToSelection(): void {
    this.showChecklistSelection = true;
    this.selectedChecklist = null;
    this.checklistId = 0;
    this.checklistNom = '';
    this.etapes = [];
    this.reponsesPartielles = [];
    this.etapesValidees = [];
    this.currentEtapeIndex = 0;
    this.currentQuestionIndex = 0;
    this.submitted = false;
    this.mode = 'etape';
  }

  // Méthode utilitaire pour calculer le total des questions d'une checklist
  getTotalQuestions(checklist: CheckListDto): number {
    if (!checklist.etapes) return 0;
    return checklist.etapes.reduce((total, etape) => total + (etape.questions?.length || 0), 0);
  }

  // === MÉTHODES EXISTANTES (conservées avec quelques ajustements) ===

  private loadCurrentUser(): void {
    this.currentUser = localStorage.getItem('currentUser') || 'utilisateur_anonyme';
  }

  loadChecklist() {
    if (!this.checklistId) return;
    
    this.loading = true;
    this.checkListService.getCheckList(this.checklistId).subscribe({
      next: (checklist: CheckListDto) => {
        this.checklistNom = checklist.libelle;
        this.etapes = checklist.etapes;

        // Initialisation sécurisée des étapes validées
        this.etapesValidees = new Array(this.etapes.length).fill(false);

        this.loading = false;

        // Vérifier si les étapes sont bien chargées avant de manipuler les indices
        if (this.etapes.length > 0) {
          if (this.currentEtapeIndex === undefined || this.currentEtapeIndex >= this.etapes.length) {
            this.currentEtapeIndex = 0;
          }
          const currentEtape = this.etapes[this.currentEtapeIndex];
          
          if (currentEtape && currentEtape.questions.length > 0) {
            this.currentQuestionIndex = 0;
          }
        }

        // Charger les étapes validées après avoir initialisé les indices
        this.loadEtapesValidees();
        this.loadPartialProgress();
      },
      error: (_err: any) => {
        this.loading = false;
        alert('Erreur lors du chargement de la checklist.');
      }
    });
  }

  // === GETTERS ===
  get currentEtape(): EtapeDto | null {
    return this.etapes[this.currentEtapeIndex] || null;
  }
  get currentQuestion(): QuestionDto | null {
    const etape = this.currentEtape;
    return etape?.questions?.[this.currentQuestionIndex] ?? null;
  }
  get isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }
  get isLastQuestionInEtape(): boolean {
    const etape = this.currentEtape;
    if (!etape) return true;
    return this.currentQuestionIndex === etape.questions.length - 1;
  }

  get totalQuestions(): number {
    return this.etapes.reduce((total, etape) => total + etape.questions.length, 0);
  }
  get answeredQuestions(): number {
    return this.reponsesPartielles.length;
  }
  get etapesCompletees(): number {
    return this.etapesValidees.filter(v => v).length;
  }

  // === PROGRESSION ===
  private isNonEmpty(v?: string | null): boolean {
    return !!v && v.trim() !== '';
  }

  getGlobalProgress(): number {
    const total = this.totalQuestions;
    if (total === 0) return 0;
    const answered = this.etapes.reduce((acc, _, idx) => acc + this.getEtapeAnsweredQuestions(idx), 0);
    return (answered / total) * 100;
  }

  getEtapeProgress(etapeIndex: number): number {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions?.length) return 0;
    const answered = etape.questions.filter(q => this.isNonEmpty(this.getQuestionResponse(q.id))).length;
    return (answered / etape.questions.length) * 100;
  }

  getEtapeAnsweredQuestions(etapeIndex: number): number {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions) return 0;
    return etape.questions.filter(q => this.isNonEmpty(this.getQuestionResponse(q.id))).length;
  }

  // Étape complète = toutes les questions avec réponse non vide
  isEtapeComplete(etapeIndex: number): boolean {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions?.length) return false;
    return etape.questions.every(q => this.isNonEmpty(this.getQuestionResponse(q.id)));
  }

  // === VALIDATION ÉTAPES ===
  validerEtape() {
    if (this.isEtapeComplete(this.currentEtapeIndex)) {
      this.etapesValidees[this.currentEtapeIndex] = true;
      this.savePartialProgress();

      if (this.currentEtapeIndex === this.etapes.length - 1) {
        this.submitFinalForm();
      } else {
        // passer à l'étape suivante
        this.currentEtapeIndex++;
        this.currentQuestionIndex = 0;
        this.mode = 'etape';
        this.savePartialProgress();
      }
    }
  }

  reouvrirEtape(etapeIndex: number) {
    this.etapesValidees[etapeIndex] = false;
    this.savePartialProgress();
  }

  // === NAVIGATION ===
  commencerEtape(etapeIndex: number) {
    this.currentEtapeIndex = etapeIndex;
    this.mode = 'question';
    this.goToFirstUnansweredQuestion();
    this.savePartialProgress();
  }

  retourAuTableauDeBord() {
    this.mode = 'etape';
    this.savePartialProgress();
  }

  nextQuestion() {
    if (!this.isLastQuestionInEtape) {
      this.currentQuestionIndex++;
      this.savePartialProgress();
    }
  }

  prevQuestion() {
    if (!this.isFirstQuestion) {
      this.currentQuestionIndex--;
      this.savePartialProgress();
    }
  }

  canGoNext(): boolean {
    const q = this.currentQuestion;
    if (!q) return false;
    return this.isNonEmpty(this.getQuestionResponse(q.id));
  }

  private goToFirstUnansweredQuestion(): void {
    const etape = this.currentEtape;
    if (!etape?.questions?.length) {
      this.currentQuestionIndex = 0;
      return;
    }
    const idx = etape.questions.findIndex(q => !this.isNonEmpty(this.getQuestionResponse(q.id)));
    this.currentQuestionIndex = idx >= 0 ? idx : 0;
  }

  // === RÉPONSES ===
  getQuestionResponse(questionId: number): string | null {
    const response = this.reponsesPartielles.find(r => r.questionId === questionId);
    return response?.reponse ?? null;
  }

  isQuestionResponse(questionId: number, value: string): boolean {
    return this.getQuestionResponse(questionId) === value;
  }

  onAnswerSelected(questionId: number, value: string) {
    const response: QuestionResponseDto = { questionId, reponse: value };
    const existingIndex = this.reponsesPartielles.findIndex(r => r.questionId === questionId);

    if (existingIndex >= 0) this.reponsesPartielles[existingIndex] = response;
    else this.reponsesPartielles.push(response);

    this.savePartialProgress();

    // Avancer automatiquement si on est en mode question
    if (this.mode === 'question' && this.autoAdvance && this.canGoNext()) {
      if (!this.isLastQuestionInEtape) this.nextQuestion();
    }
  }

  // === STORAGE ===
  savePartialProgress() {
    const partialData = {
      checkListId: this.checklistId,
      reponses: this.reponsesPartielles,
      currentEtape: this.currentEtapeIndex,
      currentQuestion: this.currentQuestionIndex,
      etapesValidees: this.etapesValidees,
      mode: this.mode
    };
    localStorage.setItem(`checklist_${this.checklistId}_progress`, JSON.stringify(partialData));
  }

  loadPartialProgress() {
    const saved = localStorage.getItem(`checklist_${this.checklistId}_progress`);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        this.reponsesPartielles = progress.reponses || [];
        this.currentEtapeIndex = Number.isInteger(progress.currentEtape) ? progress.currentEtape : 0;
        this.currentQuestionIndex = Number.isInteger(progress.currentQuestion) ? progress.currentQuestion : 0;
        this.etapesValidees = progress.etapesValidees || new Array(this.etapes.length).fill(false);
        this.mode = progress.mode || 'etape';
      } catch (_e) {
        // ignore
      }
    }
  }

  loadEtapesValidees() {
    this.etapes.forEach((_, index) => {
      this.etapesValidees[index] = this.isEtapeComplete(index);
    });
  }

  // === SUBMIT ===
  submitFinalForm() {
    if (this.reponsesPartielles.length === 0) {
      alert('Aucune réponse à soumettre !');
      return;
    }

    const toutesEtapesValidees = this.etapes.every((_, index) => this.isEtapeComplete(index));
    if (!toutesEtapesValidees) {
      alert('Veuillez compléter toutes les étapes avant de soumettre.');
      return;
    }

    // Créer la soumission avec date et utilisateur
    const formData: FormResponseDto = {
      checkListId: this.checklistId,
      reponses: this.reponsesPartielles,
      submittedBy: this.currentUser,
      submittedAt: new Date().toISOString()
    };

    console.log('Nouvelle soumission:', formData);

    this.loading = true;
    
    // Utiliser FormService pour la soumission
    this.formService.submitForm(formData).subscribe({
      next: (response: FormSubmissionDto) => {
        console.log('Soumission réussie:', response);
        this.submitted = true;
        this.loading = false;
        
        // Nettoyer la progression locale MAIS garder l'historique dans la base
        localStorage.removeItem(`checklist_${this.checklistId}_progress`);
        
        // Afficher un message de succès avec l'ID de soumission
        alert(`Formulaire soumis avec succès !\nID de soumission: ${response.id}\nDate: ${new Date(response.submittedAt).toLocaleString()}`);
      },
      error: (err: any) => {
        console.error('Erreur de soumission:', err);
        this.loading = false;
        alert('Erreur lors de la soumission du formulaire');
      }
    });
  }

  // === RESET ===
  resetForm() {
    this.currentEtapeIndex = 0;
    this.currentQuestionIndex = 0;
    this.reponsesPartielles = [];
    this.etapesValidees = new Array(this.etapes.length).fill(false);
    this.mode = 'etape';
    this.submitted = false;
    localStorage.removeItem(`checklist_${this.checklistId}_progress`);
  }

  // === UTILITAIRES ===
  getBooleanOptions(type: string): string[] {
    return type === 'BooleanNA' ? ['Oui', 'Non', 'N/A'] : ['Oui', 'Non'];
  }

  getEtapeColorClass(etapeIndex: number): string {
    const colors = ['etape-color-0', 'etape-color-1', 'etape-color-2', 'etape-color-3'];
    return colors[etapeIndex % colors.length] || 'etape-color-0';
  }

  isLastEtape(): boolean {
    return this.currentEtapeIndex === this.etapes.length - 1;
  }

  toutesEtapesValidees(): boolean {
    return this.etapesValidees.every(v => v);
  }

  previewSoumission(): void {
    alert(`Prévisualisation: ${this.reponsesPartielles.length} réponses`);
  }

  forcerValidationEtape(etapeIndex: number): void {
    if (this.isEtapeComplete(etapeIndex)) {
      this.etapesValidees[etapeIndex] = true;
      this.savePartialProgress();
      alert(`Étape ${etapeIndex + 1} validée.`);
    } else {
      alert(`Étape ${etapeIndex + 1} incomplète. Veuillez répondre à toutes les questions.`);
    }
  }

  getEtapesCompletesNonValidees(): number[] {
    const nonValidatedEtapes: number[] = [];
    
    this.etapes.forEach((_, index) => {
      if (this.isEtapeComplete(index) && !this.etapesValidees[index]) {
        nonValidatedEtapes.push(index);
      }
    });

    return nonValidatedEtapes;
  }

  getChoiceBtnClasses(questionId: number, value: string): string {
    const selected = this.isQuestionResponse(questionId, value);
    const map = {
      'Oui': { on: 'btn-success', off: 'btn-outline-success' },
      'Non': { on: 'btn-danger',  off: 'btn-outline-danger' },
      'N/A': { on: 'btn-secondary', off: 'btn-outline-secondary' }
    } as const;

    const styles = map[value as keyof typeof map] || { on: 'btn-primary', off: 'btn-outline-primary' };
    return selected ? styles.on : styles.off;
  }

  answerBadgeClass(value: string): string {
    switch (value) {
      case 'Oui': return 'bg-success';
      case 'Non': return 'bg-danger';
      case 'N/A': return 'bg-secondary';
      default:    return 'bg-primary';
    }
  }

  getAnswerCardClass(questionId: number) {
    const response = this.getQuestionResponse(questionId);

    return {
      ok: response === 'Oui',
      ko: response === 'Non',
      na: response === 'N/A'
    };
  }

  // Nouvelle méthode pour charger une soumission existante
  loadExistingSubmission(submissionId: number): void {
    this.formService.getFormSubmissions(this.checklistId).subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
          // Charger les réponses dans l'interface
          this.reponsesPartielles = [...submission.reponses];
          this.savePartialProgress();
          alert(`Soumission ${submissionId} chargée (${submission.reponses.length} réponses)`);
        }
      },
      error: (err) => {
        console.error('Erreur chargement soumission:', err);
        alert('Erreur lors du chargement de la soumission');
      }
    });
  }

  // Méthode pour voir l'historique des soumissions
  viewSubmissionHistory(): void {
    this.formService.getFormSubmissions(this.checklistId).subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        if (submissions.length === 0) {
          alert('Aucune soumission historique trouvée.');
          return;
        }

        const historyMessage = submissions.map(s => 
          `Soumission #${s.id} - ${new Date(s.submittedAt).toLocaleString()} - Par: ${s.submittedBy} - ${s.reponses.length} réponses`
        ).join('\n');

        alert(`Historique des soumissions:\n\n${historyMessage}`);
      },
      error: (err) => {
        console.error('Erreur historique:', err);
        alert('Erreur lors du chargement de l\'historique');
      }
    });
  }
}