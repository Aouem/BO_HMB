import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CheckListService} from '../../services/check-list-service';
import { CheckListDto, CreateCheckListDto, CreateResponseOptionDto, FormSubmissionDto } from '../../models';

// --- Interfaces frontend ---
interface QuestionFrontend {
  id?: number;
  texte: string;
  type: 'Boolean' | 'BooleanNA' | 'Texte' | 'Liste';
  options: { id?: number; valeur: string }[];
  reponse?: string | null;
  height?: string;
  ordre?: number;
}

interface EtapeFrontend {
  id?: number;
  nom: string;
  questions: QuestionFrontend[];
  height?: string;
  ordre?: number;
}

interface CheckListFrontend {
  id?: number;
  libelle: string;
  etapes: EtapeFrontend[];
}

interface SubmissionWithDetails extends FormSubmissionDto {
  expanded?: boolean;
  checklistName?: string;
  showDetails?: boolean;
}

@Component({
  selector: 'app-checklist-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checklist-list.html',
  styleUrls: ['./checklist-list.css']
})
export class CheckListListComponent implements OnInit {
  checklists: CheckListFrontend[] = [];
  filteredChecklists: CheckListFrontend[] = [];
  loading = true;
  searchTerm: string = '';

  // Nouveaux états pour les soumissions
  submissions: SubmissionWithDetails[] = [];
  selectedChecklistId: number | null = null;
  submissionsLoading = false;
  activeTab: 'edit' | 'history' = 'edit';

  // Pour le détail d'une soumission
  selectedSubmission: SubmissionWithDetails | null = null;

  constructor(
    private checklistService: CheckListService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadChecklists();
  }

  // --- Charger les checklists depuis le backend ---
  loadChecklists(): void {
    this.checklistService.getAllCheckLists().subscribe({
      next: (data: CheckListDto[]) => {
        this.checklists = data.map(cl => ({
          id: cl.id,
          libelle: cl.libelle,
          etapes: cl.etapes?.map((e, index) => ({
            id: e.id,
            nom: e.nom,
            ordre: e.ordre || index,
            questions: e.questions?.map((q, qIndex) => ({
              id: q.id,
              texte: q.texte,
              type: ['Boolean', 'BooleanNA', 'Texte', 'Liste'].includes(q.type) ? q.type as QuestionFrontend['type'] : 'Boolean',
              options: q.options?.map(o => ({ id: o.id, valeur: o.valeur })) || [],
              reponse: '',
              ordre: qIndex
            })) || []
          })) || []
        }));
        this.filteredChecklists = [...this.checklists];
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // === NOUVELLES MÉTHODES POUR L'HISTORIQUE ===

  // Charger toutes les soumissions (pour toutes les checklists)
  loadAllSubmissions(): void {
    this.submissionsLoading = true;
    this.submissions = [];
    
    // Charger les soumissions pour chaque checklist
    const submissionPromises = this.checklists.map(checklist => 
      this.checklistService.getChecklistSubmissions(checklist.id!).toPromise()
    );

    Promise.all(submissionPromises).then(results => {
      results.forEach((submissions, index) => {
        if (submissions && submissions.length > 0) {
          const checklist = this.checklists[index];
          submissions.forEach(sub => {
            this.submissions.push({
              ...sub,
              expanded: false,
              checklistName: checklist.libelle,
              showDetails: false
            });
          });
        }
      });
      
      // Trier par date (plus récent en premier)
      this.submissions.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      this.submissionsLoading = false;
      this.activeTab = 'history';
    }).catch(err => {
      console.error('Erreur chargement soumissions:', err);
      this.submissionsLoading = false;
      alert('Erreur lors du chargement de l\'historique');
    });
  }

  // Afficher les détails d'une soumission
  showSubmissionDetails(submission: SubmissionWithDetails): void {
    this.selectedSubmission = submission;
    submission.showDetails = true;
  }

  // Masquer les détails
  hideSubmissionDetails(): void {
    if (this.selectedSubmission) {
      this.selectedSubmission.showDetails = false;
    }
    this.selectedSubmission = null;
  }

  // Obtenir le nom d'une checklist
  getChecklistName(checklistId: number): string {
    const checklist = this.checklists.find(cl => cl.id === checklistId);
    return checklist?.libelle || 'Checklist inconnue';
  }

  // Formater la date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtenir le badge de statut basé sur les réponses
  getSubmissionStatus(submission: FormSubmissionDto): { class: string, text: string } {
    const totalQuestions = submission.reponses.length;
    const answeredQuestions = submission.reponses.filter(r => r.reponse && r.reponse.trim() !== '').length;
    
    if (answeredQuestions === 0) return { class: 'status-empty', text: 'Vide' };
    if (answeredQuestions === totalQuestions) return { class: 'status-complete', text: 'Complète' };
    return { class: 'status-partial', text: 'Partielle' };
  }

  // Compter les réponses par type
  countResponsesByType(submission: FormSubmissionDto): { oui: number, non: number, na: number, texte: number } {
    const counts = { oui: 0, non: 0, na: 0, texte: 0 };
    
    submission.reponses.forEach(response => {
      const reponse = response.reponse?.toLowerCase() || '';
      if (reponse.includes('oui')) counts.oui++;
      else if (reponse.includes('non')) counts.non++;
      else if (reponse.includes('n/a') || reponse.includes('na')) counts.na++;
      else if (reponse.trim() !== '') counts.texte++;
    });
    
    return counts;
  }

  // Obtenir le texte d'une question par son ID
  getQuestionText(questionId: number): string {
    for (const checklist of this.checklists) {
      for (const etape of checklist.etapes) {
        for (const question of etape.questions) {
          if (question.id === questionId) {
            return question.texte;
          }
        }
      }
    }
    return 'Question non trouvée';
  }

  // Obtenir la classe CSS pour une réponse
  getAnswerClass(reponse: string | undefined): string {
    if (!reponse) return 'answer-empty';
    
    const reponseLower = reponse.toLowerCase();
    if (reponseLower.includes('oui')) return 'answer-yes';
    if (reponseLower.includes('non')) return 'answer-no';
    if (reponseLower.includes('n/a') || reponseLower.includes('na')) return 'answer-na';
    return 'answer-text';
  }

  // === MÉTHODES EXISTANTES (conservées) ===

  // --- Filtre de recherche ---
  filterChecklists(): void {
    if (!this.searchTerm.trim()) {
      this.filteredChecklists = [...this.checklists];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    
    this.filteredChecklists = this.checklists.filter(checklist => 
      checklist.libelle.toLowerCase().includes(searchLower) ||
      checklist.etapes.some(etape => 
        etape.nom.toLowerCase().includes(searchLower) ||
        etape.questions.some(question => 
          question.texte.toLowerCase().includes(searchLower)
        )
      )
    );
  }

  // --- Réinitialiser la recherche ---
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredChecklists = [...this.checklists];
  }

  // --- Obtenir le nombre total de questions d'une checklist ---
  getTotalQuestions(checklist: CheckListFrontend): number {
    return checklist.etapes.reduce((total, etape) => total + etape.questions.length, 0);
  }

  // --- Obtenir le nombre total d'étapes d'une checklist ---
  getTotalEtapes(checklist: CheckListFrontend): number {
    return checklist.etapes.length;
  }

  // --- Navigation vers la page détail d'une checklist ---
  viewChecklistDetail(checklistId: number): void {
    this.router.navigate(['/checklists', checklistId]);
  }

  // --- Navigation vers l'édition d'une checklist ---
  editChecklist(checklistId: number): void {
    this.router.navigate(['/checklists', checklistId, 'edit']);
  }

  // --- Étapes ---
  addEtape(checklist: CheckListFrontend) {
    if (!checklist.etapes) checklist.etapes = [];
    const newOrdre = checklist.etapes.length;
    checklist.etapes.push({
      id: 0,
      nom: '',
      questions: [],
      ordre: newOrdre
    });
  }

  removeEtape(checklist: CheckListFrontend, index: number) {
    checklist.etapes.splice(index, 1);
    checklist.etapes.forEach((etape, idx) => {
      etape.ordre = idx;
    });
  }

  updateEtapeNom(etape: EtapeFrontend, value: string) {
    etape.nom = value;
  }

  // --- Questions ---
  addQuestion(etape: EtapeFrontend) {
    const newOrdre = etape.questions.length;
    etape.questions.push({
      id: 0,
      texte: '',
      type: 'Boolean',
      options: [],
      reponse: '',
      ordre: newOrdre
    });
  }

  removeQuestion(etape: EtapeFrontend, index: number) {
    etape.questions.splice(index, 1);
    etape.questions.forEach((question, idx) => {
      question.ordre = idx;
    });
  }

  updateQuestionTexte(question: QuestionFrontend, value: string) {
    question.texte = value;
  }

  updateQuestionType(question: QuestionFrontend, value: string) {
    question.type = value as QuestionFrontend['type'];
    if (value !== 'Liste') question.options = [];
    if (!question.reponse) question.reponse = '';
  }

  addOption(question: QuestionFrontend) {
    question.options.push({ valeur: '' });
  }

  removeOption(question: QuestionFrontend, index: number) {
    question.options.splice(index, 1);
  }

  getBooleanOptions(q: QuestionFrontend): string[] {
    return q.type === 'BooleanNA' ? ['Oui', 'Non', 'N/A'] : ['Oui', 'Non'];
  }

  // --- Sauvegarder checklist ---
  saveChecklist(checklist: CheckListFrontend) {
    const createPayload: CreateCheckListDto = {
      libelle: checklist.libelle,
      etapes: checklist.etapes.map((etape, etapeIndex) => ({
        nom: etape.nom,
        ordre: etape.ordre !== undefined ? etape.ordre : etapeIndex,
        questions: etape.questions.map((question, questionIndex) => {
          const options: CreateResponseOptionDto[] = question.options.map((option, optionIndex) => ({
            texte: option.valeur,
            valeur: option.valeur,
            ordre: optionIndex
          }));

          return {
            libelle: question.texte,
            type: question.type,
            ordre: question.ordre !== undefined ? question.ordre : questionIndex,
            options: options,
            reponse: question.reponse || undefined
          };
        })
      }))
    };

    if (checklist.id && checklist.id > 0) {
      this.checklistService.updateCheckList(checklist.id, createPayload).subscribe({
        next: (res: CheckListDto) => {
          console.log('Checklist mise à jour avec succès', res);
          const index = this.checklists.findIndex(cl => cl.id === checklist.id);
          if (index !== -1) {
            this.checklists[index] = {
              ...this.checklists[index],
              libelle: res.libelle,
              etapes: res.etapes.map((e, etapeIndex) => ({
                id: e.id,
                nom: e.nom,
                ordre: e.ordre || etapeIndex,
                questions: e.questions.map((q, questionIndex) => ({
                  id: q.id,
                  texte: q.texte,
                  type: q.type as QuestionFrontend['type'],
                  options: q.options.map(o => ({ id: o.id, valeur: o.valeur })),
                  reponse: '',
                  ordre: questionIndex
                }))
              }))
            };
            this.filteredChecklists = [...this.checklists];
          }
          alert('Checklist mise à jour avec succès !');
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour:', err);
          alert('Erreur lors de la mise à jour de la checklist');
        }
      });
    } else {
      this.checklistService.createCheckList(createPayload).subscribe({
        next: (res: CheckListDto) => {
          console.log('Checklist créée avec succès', res);
          this.loadChecklists();
          alert('Checklist créée avec succès !');
        },
        error: (err) => {
          console.error('Erreur lors de la création:', err);
          alert('Erreur lors de la création de la checklist');
        }
      });
    }
  }

  // --- Supprimer checklist ---
  deleteChecklist(checklist: CheckListFrontend) {
    if (!checklist.id) return;
    if (!confirm(`Voulez-vous vraiment supprimer la checklist "${checklist.libelle}" ?`)) return;

    this.checklistService.deleteCheckList(checklist.id).subscribe({
      next: () => {
        this.checklists = this.checklists.filter(cl => cl.id !== checklist.id);
        this.filteredChecklists = this.filteredChecklists.filter(cl => cl.id !== checklist.id);
        console.log(`Checklist "${checklist.libelle}" supprimée.`);
      },
      error: (err) => {
        console.error('Erreur lors de la suppression :', err);
      }
    });
  }

  // --- Créer une nouvelle checklist ---
  createNewChecklist(): void {
    this.router.navigate(['/checklists/new']);
  }



  // === MÉTHODES POUR LES CHAMPS ADAPTATIFS ===
  getInputWidth(value: string | undefined | null, minWidth: number = 200): string {
    return '100%';
  }

  getSelectWidth(value: string | undefined | null, minWidth: number = 180): string {
    if (!value) return minWidth + 'px';
    const length = value.length;
    const calculatedWidth = Math.max(minWidth, length * 8 + 60);
    return Math.min(calculatedWidth, 400) + 'px';
  }

  getFieldWidth(value: string | undefined | null, minWidth: number = 200): string {
    return '100%';
  }

  getOptionWidth(option: { valeur: string } | undefined, minWidth: number = 150): string {
    return '100%';
  }

  autoResizeField(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) {
      const content = target.textContent || '';
      const width = Math.max(200, content.length * 10 + 40);
      target.style.width = Math.min(width, 1000) + 'px';
    }
  }

  onInputResize(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      const value = target.value;
      const width = Math.max(200, value.length * 8 + 40);
      target.style.width = Math.min(width, 800) + 'px';
    }
  }

  getTextareaHeight(value: string | undefined | null, minHeight: number = 60): string {
    if (!value) return minHeight + 'px';
    const lineCount = (value.match(/\n/g) || []).length + 1;
    const calculatedHeight = Math.max(minHeight, lineCount * 24 + 32);
    return Math.min(calculatedHeight, 300) + 'px';
  }

  generateParticles(questionIndex: number): void {
    console.log('Génération de particules pour la question', questionIndex);
  }

  animateNewQuestion(etape: EtapeFrontend, questionIndex: number): void {
    const newQuestion = etape.questions[questionIndex];
    setTimeout(() => {}, 100);
  }

  centerText(element: HTMLElement): void {
    element.style.textAlign = 'center';
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
  }

  // Méthodes pour identifier le type d'étape
  isAvantIntervention(nomEtape: string): boolean {
    return nomEtape.toLowerCase().includes('avant') || 
           nomEtape.toLowerCase().includes('time-out') ||
           nomEtape.toLowerCase().includes('pause');
  }

  isPendantIntervention(nomEtape: string): boolean {
    return nomEtape.toLowerCase().includes('pendant') || 
           nomEtape.toLowerCase().includes('intervention') ||
           nomEtape.toLowerCase().includes('chirurgie');
  }

  isApresIntervention(nomEtape: string): boolean {
    return nomEtape.toLowerCase().includes('après') || 
           nomEtape.toLowerCase().includes('post') ||
           nomEtape.toLowerCase().includes('récupération');
  }

  isControleFinal(nomEtape: string): boolean {
    return nomEtape.toLowerCase().includes('contrôle') || 
           nomEtape.toLowerCase().includes('final') ||
           nomEtape.toLowerCase().includes('vérification');
  }

  getEtapeType(nomEtape: string): string {
    if (this.isAvantIntervention(nomEtape)) return 'Avant';
    if (this.isPendantIntervention(nomEtape)) return 'Pendant';
    if (this.isApresIntervention(nomEtape)) return 'Après';
    if (this.isControleFinal(nomEtape)) return 'Contrôle';
    return 'Phase';
  }

  isLongQuestion(texte: string): boolean {
    return texte.length > 100;
  }

  isConfirmationQuestion(texte: string): boolean {
    return texte.toLowerCase().includes('confirmation') || 
           texte.toLowerCase().includes('vérifier') ||
           texte.toLowerCase().includes('contrôler');
  }

  isImportantQuestion(texte: string): boolean {
    return texte.toLowerCase().includes('sécurité') || 
           texte.toLowerCase().includes('risque') ||
           texte.toLowerCase().includes('indésirable') ||
           texte.toLowerCase().includes('signalement');
  }

  onTextareaResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      target.style.height = 'auto';
      const newHeight = Math.max(target.scrollHeight, parseInt(target.getAttribute('min-height') || '80'));
      target.style.height = newHeight + 'px';
      if (target.value.length > 100) {
        target.classList.add('long-question');
      } else {
        target.classList.remove('long-question');
      }
    }
  }

  reorderEtapes(checklist: CheckListFrontend, oldIndex: number, newIndex: number): void {
    const [movedEtape] = checklist.etapes.splice(oldIndex, 1);
    checklist.etapes.splice(newIndex, 0, movedEtape);
    checklist.etapes.forEach((etape, index) => {
      etape.ordre = index;
    });
  }

  reorderQuestions(etape: EtapeFrontend, oldIndex: number, newIndex: number): void {
    const [movedQuestion] = etape.questions.splice(oldIndex, 1);
    etape.questions.splice(newIndex, 0, movedQuestion);
    etape.questions.forEach((question, index) => {
      question.ordre = index;
    });
  }
}