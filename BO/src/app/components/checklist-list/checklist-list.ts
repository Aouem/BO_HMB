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

  // === NOUVELLES MÉTHODES POUR L'IMPRESSION ===

  // Générer un rapport d'impression complet pour une soumission
  printSubmission(submission: SubmissionWithDetails): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour l\'impression');
      return;
    }

    const counts = this.countResponsesByType(submission);
    const status = this.getSubmissionStatus(submission);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Checklist - ${submission.checklistName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            margin: 20px; 
            color: #333;
          }
          .header { 
            border-bottom: 3px solid #2c3e50; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
          }
          .header h1 { 
            color: #2c3e50; 
            margin: 0; 
            font-size: 24px;
          }
          .header-info { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 10px;
            font-size: 14px;
          }
          .summary { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
          }
          .summary-stats { 
            display: flex; 
            gap: 20px; 
            margin-top: 10px;
          }
          .stat { 
            text-align: center; 
            padding: 10px;
          }
          .stat-count { 
            font-size: 24px; 
            font-weight: bold; 
            display: block;
          }
          .stat-yes { color: #27ae60; }
          .stat-no { color: #e74c3c; }
          .stat-na { color: #95a5a6; }
          .stat-text { color: #3498db; }
          .etape { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .etape-title { 
            background: #34495e; 
            color: white; 
            padding: 10px 15px; 
            border-radius: 5px; 
            margin-bottom: 10px;
            font-weight: bold;
          }
          .question { 
            margin-bottom: 15px; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 5px;
            page-break-inside: avoid;
          }
          .question-text { 
            font-weight: bold; 
            margin-bottom: 8px;
          }
          .answer { 
            padding: 5px 10px; 
            border-radius: 3px; 
            display: inline-block;
            font-weight: bold;
          }
          .answer-yes { background: #d5f4e6; color: #27ae60; }
          .answer-no { background: #fadbd8; color: #e74c3c; }
          .answer-na { background: #ecf0f1; color: #7f8c8d; }
          .answer-text { background: #d6eaf8; color: #2980b9; }
          .answer-empty { background: #f2f3f4; color: #95a5a6; font-style: italic; }
          .signature-area { 
            margin-top: 50px; 
            border-top: 2px solid #000; 
            padding-top: 20px;
          }
          .signature-line { 
            display: inline-block; 
            width: 200px; 
            border-top: 1px solid #000; 
            margin: 0 20px;
          }
          @media print {
            body { margin: 15px; }
            .summary { background: #f8f9fa !important; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${submission.checklistName}</h1>
          <div class="header-info">
            <div><strong>Date :</strong> ${this.formatDate(submission.submittedAt)}</div>
            <div><strong>Statut :</strong> <span style="color: ${
              status.class === 'status-complete' ? '#27ae60' : 
              status.class === 'status-partial' ? '#f39c12' : '#e74c3c'
            }">${status.text}</span></div>
          </div>
        </div>

        <div class="summary">
          <h3>📊 RÉSUMÉ DES RÉPONSES</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-count stat-yes">${counts.oui}</span>
              <span>✅ Oui</span>
            </div>
            <div class="stat">
              <span class="stat-count stat-no">${counts.non}</span>
              <span>❌ Non</span>
            </div>
            <div class="stat">
              <span class="stat-count stat-na">${counts.na}</span>
              <span>⚪ N/A</span>
            </div>
            <div class="stat">
              <span class="stat-count stat-text">${counts.texte}</span>
              <span>📝 Texte</span>
            </div>
          </div>
        </div>

        <div class="content">
          ${this.generateSubmissionContent(submission)}
        </div>

        <div class="signature-area">
          <p><strong>Checklist validée par l'équipe :</strong></p>
          <br><br>
          <div>
            <span>Chirurgien</span>
            <span class="signature-line"></span>
            <span>Anesthésiste / IADE</span>
            <span class="signature-line"></span>
            <span>Coordonnateur</span>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ Imprimer ce rapport
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            ❌ Fermer
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  // Générer le contenu détaillé de la soumission
  private generateSubmissionContent(submission: FormSubmissionDto): string {
    let content = '';
    
    // Organiser les réponses par étape
    const reponsesParEtape = this.organizeResponsesByEtape(submission);
    
    reponsesParEtape.forEach((reponses, nomEtape) => {
      content += `
        <div class="etape">
          <div class="etape-title">${nomEtape}</div>
      `;
      
      reponses.forEach(reponse => {
        const questionText = this.getQuestionText(reponse.questionId);
        const answerClass = this.getAnswerClass(reponse.reponse);
        const answerText = reponse.reponse || 'Non renseigné';
        
        content += `
          <div class="question">
            <div class="question-text">${questionText}</div>
            <div class="answer ${answerClass}">${answerText}</div>
          </div>
        `;
      });
      
      content += `</div>`;
    });
    
    return content;
  }

  // Organiser les réponses par étape
  private organizeResponsesByEtape(submission: FormSubmissionDto): Map<string, any[]> {
    const reponsesParEtape = new Map<string, any[]>();
    
    submission.reponses.forEach(reponse => {
      const etape = this.findEtapeByQuestionId(reponse.questionId);
      const nomEtape = etape?.nom || 'Étape inconnue';
      
      if (!reponsesParEtape.has(nomEtape)) {
        reponsesParEtape.set(nomEtape, []);
      }
      
      reponsesParEtape.get(nomEtape)!.push(reponse);
    });
    
    return reponsesParEtape;
  }

  // Trouver l'étape d'une question par son ID
  private findEtapeByQuestionId(questionId: number): EtapeFrontend | null {
    for (const checklist of this.checklists) {
      for (const etape of checklist.etapes) {
        for (const question of etape.questions) {
          if (question.id === questionId) {
            return etape;
          }
        }
      }
    }
    return null;
  }

  // Imprimer toutes les soumissions (rapport global)
  printAllSubmissions(): void {
    if (this.submissions.length === 0) {
      alert('Aucune soumission à imprimer');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour l\'impression');
      return;
    }

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Global des Checklists</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 3px solid #2c3e50; padding-bottom: 15px; }
          .submission { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .submission-header { background: #f8f9fa; padding: 10px; border-radius: 3px; margin-bottom: 10px; }
          .stats { display: flex; gap: 15px; margin: 10px 0; }
          .stat { padding: 5px 10px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport Global des Checklists</h1>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
    `;

    this.submissions.forEach((submission, index) => {
      const counts = this.countResponsesByType(submission);
      const status = this.getSubmissionStatus(submission);
      
      content += `
        <div class="submission">
          <div class="submission-header">
            <h3>${submission.checklistName} - ${this.formatDate(submission.submittedAt)}</h3>
            <div class="stats">
              <span class="stat" style="background:#d5f4e6;color:#27ae60;">✅ ${counts.oui} Oui</span>
              <span class="stat" style="background:#fadbd8;color:#e74c3c;">❌ ${counts.non} Non</span>
              <span class="stat" style="background:#ecf0f1;color:#7f8c8d;">⚪ ${counts.na} N/A</span>
              <span class="stat" style="background:#d6eaf8;color:#2980b9;">📝 ${counts.texte} Texte</span>
              <span class="stat" style="background:${
                status.class === 'status-complete' ? '#d5f4e6' : 
                status.class === 'status-partial' ? '#fdebd0' : '#fadbd8'
              };">${status.text}</span>
            </div>
          </div>
        </div>
      `;
    });

    content += `
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ Imprimer le rapport global
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }

  // === MÉTHODES EXISTANTES (conservées) ===

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

  // === MÉTHODES POUR L'HISTORIQUE ===

  // Charger toutes les soumissions (pour toutes les checklists)
  loadAllSubmissions(): void {
    this.submissionsLoading = true;
    this.submissions = [];
    
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