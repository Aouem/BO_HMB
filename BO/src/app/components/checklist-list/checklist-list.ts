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
export class ChecklistListComponent implements OnInit {
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

  // Variables pour le filtrage
  selectedDate: string = '';
  selectedChecklistForPrint: number | null = null;

  constructor(
    private checklistService: CheckListService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadChecklists();
  }

  // === MÉTHODES DE DIAGNOSTIC ET DEBUG ===

  // Méthode pour diagnostiquer le problème de mapping
  diagnoseSubmissionProblem(): void {
    console.log('🩺 Diagnostic du problème de soumissions pour TOUTES les checklists...');
    
    // Diagnostiquer pour chaque checklist
    this.checklists.forEach(checklist => {
      if (checklist.id) {
        console.log(`📋 Checklist "${checklist.libelle}" (ID: ${checklist.id}) - IDs de questions:`);
        
        const questionIds: number[] = [];
        checklist.etapes.forEach(etape => {
          etape.questions.forEach(question => {
            questionIds.push(question.id!);
            console.log(`  Question: "${question.texte.substring(0, 50)}..." → ID: ${question.id}`);
          });
        });
        
        this.checklistService.getChecklistSubmissions(checklist.id).subscribe(submissions => {
          if (submissions && submissions.length > 0) {
            const submission = submissions[0];
            console.log(`📄 Première soumission pour "${checklist.libelle}":`);
            if (submission.reponses && submission.reponses.length > 0) {
              submission.reponses.forEach(reponse => {
                console.log(`  Réponse: QuestionID=${reponse.questionId}, Réponse="${reponse.reponse}"`);
                console.log(`  ❓ Cette questionID existe dans la checklist: ${questionIds.includes(reponse.questionId)}`);
              });
              
              const missingQuestionIds = submission.reponses
                .map(r => r.questionId)
                .filter(questionId => !questionIds.includes(questionId));
              
              if (missingQuestionIds.length > 0) {
                console.log(`❌ IDs de questions manquants dans "${checklist.libelle}":`, missingQuestionIds);
              } else {
                console.log(`✅ Tous les IDs de questions correspondent pour "${checklist.libelle}"`);
              }
            } else {
              console.log(`⚠️ Aucune réponse dans la soumission pour "${checklist.libelle}"`);
            }
          } else {
            console.log(`❌ Aucune soumission trouvée pour "${checklist.libelle}"`);
          }
        });
      }
    });
  }

  // Méthode pour debugger les IDs de questions
  debugQuestionIds(): void {
    console.log('🔍 Debug des IDs de questions dans les checklists:');
    this.checklists.forEach(checklist => {
      console.log(`📋 Checklist "${checklist.libelle}" (ID: ${checklist.id}):`);
      checklist.etapes.forEach((etape, etapeIndex) => {
        console.log(`  Étape ${etapeIndex + 1}: "${etape.nom}"`);
        etape.questions.forEach((question, questionIndex) => {
          console.log(`    Q${questionIndex + 1}: ID=${question.id}, Texte="${question.texte}"`);
        });
      });
    });
  }

  // Méthode pour charger les soumissions pour une checklist spécifique
  loadSubmissionsForChecklist(checklistId: number): void {
    this.submissionsLoading = true;
    
    console.log(`🔍 Chargement des soumissions pour la checklist ID: ${checklistId}...`);
    
    this.checklistService.getChecklistSubmissions(checklistId).subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        console.log(`📦 Soumissions brutes reçues pour checklist ${checklistId}:`, submissions);
        
        if (submissions && submissions.length > 0) {
          submissions.forEach((sub, index) => {
            console.log(`📄 Soumission ${index + 1}:`, {
              id: sub.id,
              checkListId: sub.checkListId,
              reponsesCount: sub.reponses?.length || 0,
              reponses: sub.reponses
            });
            
            const submissionWithDetails: SubmissionWithDetails = {
              ...sub,
              expanded: false,
              checklistName: this.getChecklistName(sub.checkListId),
              showDetails: false
            };
            
            this.submissions.push(submissionWithDetails);
          });
        } else {
          console.log(`❌ Aucune soumission trouvée pour la checklist ${checklistId}`);
        }
        
        this.submissions.sort((a, b) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        
        this.submissionsLoading = false;
        this.activeTab = 'history';
        
        console.log(`🎯 ${this.submissions.length} soumissions chargées pour la checklist ${checklistId}`);
      },
      error: (err) => {
        console.error(`❌ Erreur chargement soumissions pour checklist ${checklistId}:`, err);
        this.submissionsLoading = false;
        alert('Erreur lors du chargement des soumissions');
      }
    });
  }

  // === MÉTHODES MANQUANTES POUR LE TEMPLATE ===

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
      const newHeight = Math.max(target.scrollHeight, 80);
      target.style.height = newHeight + 'px';
      if (target.value.length > 100) {
        target.classList.add('long-question');
      } else {
        target.classList.remove('long-question');
      }
    }
  }

  // === MÉTHODES EXISTANTES AMÉLIORÉES ===

  cleanChecklistName(name: string): string {
    if (!name) return 'Checklist sans nom';
    
    let cleanedName = name.trim();
    
    const duplicatePattern = /^(CHECK-LIST « )+/;
    if (duplicatePattern.test(cleanedName)) {
      cleanedName = cleanedName.replace(duplicatePattern, 'CHECK-LIST « ');
      console.log(`🔄 Nom nettoyé: "${name}" → "${cleanedName}"`);
    }
    
    if (cleanedName.includes('«') && !cleanedName.includes('»')) {
      cleanedName += '»';
    }
    
    return cleanedName;
  }

  inspectProblematicChecklist(): void {
    const problematicChecklist = this.checklists.find(cl => 
      cl.libelle.includes('SÉCURITÉ DU PATIENT AU BLOC OPÉRATOIRE') || 
      cl.libelle.includes('SÉCURITÉ')
    );
    
    if (problematicChecklist) {
      console.log('🔍 Inspection de la checklist problématique:', problematicChecklist);
      
      this.checklistService.getChecklistSubmissions(problematicChecklist.id!).subscribe({
        next: (submissions) => {
          console.log(`📊 Soumissions pour "${problematicChecklist.libelle}":`, submissions);
          
          if (submissions && submissions.length > 0) {
            submissions.forEach((sub, index) => {
              console.log(`Soumission ${index + 1}:`, {
                id: sub.id,
                checkListId: sub.checkListId,
                reponsesCount: sub.reponses?.length || 0,
                submittedAt: sub.submittedAt,
                reponses: sub.reponses
              });
            });
          } else {
            console.log('❌ Aucune soumission trouvée pour cette checklist');
          }
        },
        error: (err) => {
          console.error('❌ Erreur chargement soumissions spécifiques:', err);
        }
      });
    } else {
      console.log('❌ Checklist problématique non trouvée');
    }
  }

  forceCleanAndReload(): void {
    console.log('🔄 Forcer nettoyage et rechargement...');
    
    this.checklists = [];
    this.submissions = [];
    this.loading = true;
    this.submissionsLoading = true;
    
    this.loadChecklists();
    
    setTimeout(() => {
      this.loadAllSubmissions();
    }, 1000);
  }

  getSubmissionCountForChecklist(checklistId: number): number {
    if (!checklistId) return 0;
    const count = this.submissions.filter(s => s.checkListId === checklistId).length;
    console.log(`📊 Checklist ${checklistId}: ${count} soumissions`);
    return count;
  }

  // === MÉTHODES POUR L'HISTORIQUE - VERSION CORRIGÉE ===

  loadAllSubmissions(): void {
    this.submissionsLoading = true;
    this.submissions = [];
    
    console.log('🔍 Début du chargement des soumissions...');

    this.diagnoseEmptySubmissions();
    
    // Charger les soumissions pour toutes les checklists
    this.loadSubmissionsForAllChecklists();
  }

  // NOUVELLE MÉTHODE : Charger les soumissions pour toutes les checklists
  loadSubmissionsForAllChecklists(): void {
    this.submissionsLoading = true;
    this.submissions = [];
    
    console.log('🔍 Chargement des soumissions pour toutes les checklists...');
    
    // Tableau pour stocker toutes les promesses de chargement
    const loadPromises: Promise<void>[] = [];
    
    // Pour chaque checklist, charger ses soumissions
    this.checklists.forEach(checklist => {
      if (checklist.id) {
        const promise = new Promise<void>((resolve) => {
          this.checklistService.getChecklistSubmissions(checklist.id!).subscribe({
            next: (submissions: FormSubmissionDto[]) => {
              if (submissions && submissions.length > 0) {
                submissions.forEach(sub => {
                  const submissionWithDetails: SubmissionWithDetails = {
                    ...sub,
                    expanded: false,
                    checklistName: checklist.libelle, // Utiliser le nom de la checklist actuelle
                    showDetails: false
                  };
                  this.submissions.push(submissionWithDetails);
                });
                console.log(`✅ ${submissions.length} soumissions chargées pour "${checklist.libelle}"`);
              } else {
                console.log(`ℹ️ Aucune soumission pour "${checklist.libelle}"`);
              }
              resolve();
            },
            error: (err) => {
              console.error(`❌ Erreur chargement soumissions pour ${checklist.libelle}:`, err);
              resolve();
            }
          });
        });
        loadPromises.push(promise);
      }
    });
    
    // Attendre que toutes les soumissions soient chargées
    Promise.all(loadPromises).then(() => {
      // Trier toutes les soumissions par date
      this.submissions.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      
      this.submissionsLoading = false;
      this.activeTab = 'history';
      
      console.log(`🎯 ${this.submissions.length} soumissions chargées au total pour ${this.checklists.length} checklists`);
    });
  }

  forceReloadSubmissions(): void {
    console.log('🔄 Forcer le rechargement des soumissions...');
    this.submissions = [];
    this.loadAllSubmissions();
  }

  // === MÉTHODES EXISTANTES (conservées) ===

  loadChecklists(): void {
    this.loading = true;
    this.checklistService.getAllCheckLists().subscribe({
      next: (data: CheckListDto[]) => {
        console.log('📦 Données brutes reçues du serveur:', data);
        
        this.checklists = data.map(cl => {
          const libelleClean = this.cleanChecklistName(cl.libelle);
          
          return {
            id: cl.id,
            libelle: libelleClean,
            etapes: (cl.etapes || []).map((e, index) => ({
              id: e.id,
              nom: e.nom || `Étape ${index + 1}`,
              ordre: this.getSafeOrdre(e) ?? index,
              questions: (e.questions || []).map((q, qIndex) => ({
                id: q.id,
                texte: q.texte || 'Question sans texte',
                type: ['Boolean', 'BooleanNA', 'Texte', 'Liste'].includes(q.type) ? q.type as QuestionFrontend['type'] : 'Boolean',
                options: (q.options || []).map(o => ({ 
                  id: o.id, 
                  valeur: o.valeur || 'Option sans valeur' 
                })),
                reponse: q.reponse || '',
                ordre: this.getSafeOrdre(q) ?? qIndex
              }))
            }))
          };
        });
        
        this.filteredChecklists = [...this.checklists];
        this.loading = false;
        
        console.log('✅ Checklists chargées et nettoyées:');
        this.checklists.forEach(cl => {
          console.log(`📋 Checklist ${cl.id}: "${cl.libelle}" - ${cl.etapes?.length || 0} étapes`);
        });
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement checklists:', err);
        this.loading = false;
        alert('Erreur lors du chargement des checklists');
      }
    });
  }

  private getSafeOrdre(item: any): number | undefined {
    return 'ordre' in item ? item.ordre : undefined;
  }

  showSubmissionDetails(submission: SubmissionWithDetails): void {
    this.selectedSubmission = submission;
    submission.showDetails = true;
    
    console.log('📋 Détails de la soumission:', {
      id: submission.id,
      checklistName: submission.checklistName,
      reponsesCount: submission.reponses?.length || 0,
      status: this.getSubmissionStatus(submission)
    });
  }

  hideSubmissionDetails(): void {
    if (this.selectedSubmission) {
      this.selectedSubmission.showDetails = false;
    }
    this.selectedSubmission = null;
  }

  getChecklistName(checklistId: number): string {
    const checklist = this.checklists.find(cl => cl.id === checklistId);
    return checklist?.libelle || 'Checklist inconnue';
  }

  formatDate(dateString: string): string {
    try {
      if (!dateString) return 'Date non disponible';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Erreur formatage date:', dateString, error);
      return 'Date invalide';
    }
  }

  getSubmissionStatus(submission: FormSubmissionDto): { class: string, text: string } {
    if (!submission.reponses || submission.reponses.length === 0) {
      return { class: 'status-empty', text: 'Vide' };
    }
    
    const answeredQuestions = submission.reponses.filter(r => 
      r.reponse && r.reponse.trim() !== ''
    ).length;
    
    const totalQuestions = submission.reponses.length;
    
    if (answeredQuestions === 0) return { class: 'status-empty', text: 'Vide' };
    if (answeredQuestions === totalQuestions) return { class: 'status-complete', text: 'Complète' };
    return { class: 'status-partial', text: 'Partielle' };
  }

  countResponsesByType(submission: FormSubmissionDto): { oui: number, non: number, na: number, texte: number } {
    const counts = { oui: 0, non: 0, na: 0, texte: 0 };
    
    if (!submission.reponses || submission.reponses.length === 0) {
      return counts;
    }
    
    submission.reponses.forEach(response => {
      const reponse = (response.reponse || '').toLowerCase().trim();
      
      if (reponse === '') {
        return;
      }
      
      if (reponse === 'oui') counts.oui++;
      else if (reponse === 'non') counts.non++;
      else if (reponse === 'n/a' || reponse === 'na') counts.na++;
      else counts.texte++;
    });
    
    return counts;
  }

  getQuestionText(questionId: number): string {
    if (!questionId) return 'ID de question invalide';
    
    for (const checklist of this.checklists) {
      for (const etape of checklist.etapes || []) {
        for (const question of etape.questions || []) {
          if (question.id === questionId) {
            return question.texte || 'Question sans texte';
          }
        }
      }
    }
    return `Question non trouvée (ID: ${questionId})`;
  }

  getAnswerClass(reponse: string | undefined): string {
    if (!reponse || reponse.trim() === '') return 'answer-empty';
    
    const reponseLower = reponse.toLowerCase().trim();
    if (reponseLower === 'oui') return 'answer-yes';
    if (reponseLower === 'non') return 'answer-no';
    if (reponseLower === 'n/a' || reponseLower === 'na') return 'answer-na';
    return 'answer-text';
  }

  // === MÉTHODES D'IMPRESSION PDF COMPLÈTES ===

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
          <h1>${submission.checklistName || 'Checklist sans nom'}</h1>
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

  private generateSubmissionContent(submission: FormSubmissionDto): string {
    let content = '';
    
    const reponsesParEtape = this.organizeResponsesByEtape(submission);
    
    if (reponsesParEtape.size === 0) {
      return '<p style="text-align: center; color: #95a5a6; font-style: italic;">Aucune réponse disponible pour cette soumission</p>';
    }
    
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

  private organizeResponsesByEtape(submission: FormSubmissionDto): Map<string, any[]> {
    const reponsesParEtape = new Map<string, any[]>();
    
    if (!submission.reponses || submission.reponses.length === 0) {
      return reponsesParEtape;
    }
    
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

  private findEtapeByQuestionId(questionId: number): EtapeFrontend | null {
    for (const checklist of this.checklists) {
      for (const etape of checklist.etapes || []) {
        for (const question of etape.questions || []) {
          if (question.id === questionId) {
            return etape;
          }
        }
      }
    }
    return null;
  }

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
            <h3>${submission.checklistName || 'Checklist sans nom'} - ${this.formatDate(submission.submittedAt)}</h3>
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

  // === MÉTHODES MANQUANTES AJOUTÉES ===

  diagnoseEmptySubmissions(): void {
    console.log('🩺 Diagnostic des soumissions vides...');
    
    // Diagnostiquer pour toutes les checklists
    this.checklists.forEach(checklist => {
      if (checklist.id) {
        this.checklistService.getChecklistSubmissions(checklist.id).subscribe({
          next: (submissions) => {
            console.log(`📦 Soumissions brutes de l'API pour "${checklist.libelle}":`, submissions);
            
            if (submissions && submissions.length > 0) {
              submissions.forEach((sub, index) => {
                console.log(`📄 Soumission ${sub.id}:`, {
                  id: sub.id,
                  checkListId: sub.checkListId,
                  reponses: sub.reponses,
                  reponsesCount: sub.reponses?.length || 0,
                  submittedAt: sub.submittedAt,
                  submittedBy: sub.submittedBy
                });
                
                if (sub.reponses && sub.reponses.length === 0) {
                  console.log(`  ⚠️ Soumission ${sub.id} a un tableau de réponses VIDE`);
                } else if (!sub.reponses) {
                  console.log(`  ❌ Soumission ${sub.id} n'a PAS de propriété reponses`);
                }
              });
              
              if (submissions.length > 0) {
                const firstSubmission = submissions[0];
                console.log('🔍 Structure détaillée de la première soumission:', JSON.stringify(firstSubmission, null, 2));
              }
            } else {
              console.log(`❌ Aucune soumission trouvée pour "${checklist.libelle}"`);
            }
          },
          error: (err) => {
            console.error(`❌ Erreur lors du diagnostic pour "${checklist.libelle}":`, err);
          }
        });
      }
    });
  }

  createTestSubmissions(): void {
    console.log('🧪 Création de soumissions de test...');
    
    const testSubmissions: SubmissionWithDetails[] = [];
    
    // Créer des soumissions de test pour chaque checklist
    this.checklists.forEach((checklist, index) => {
      if (checklist.id) {
        testSubmissions.push({
          id: 1000 + index,
          checkListId: checklist.id,
          submittedBy: 'Utilisateur Test',
          submittedAt: new Date().toISOString(),
          reponses: [
            { questionId: checklist.etapes[0]?.questions[0]?.id || 1, reponse: 'Oui' },
            { questionId: checklist.etapes[0]?.questions[1]?.id || 2, reponse: 'Non' },
            { questionId: checklist.etapes[0]?.questions[2]?.id || 3, reponse: 'Oui' }
          ],
          checklistName: checklist.libelle,
          expanded: false,
          showDetails: false
        });
      }
    });
    
    this.submissions = testSubmissions;
    this.submissionsLoading = false;
    this.activeTab = 'history';
    
    console.log('✅ Données de test créées pour toutes les checklists:', this.submissions);
    alert('Données de test créées avec succès !');
  }

  printFilteredSubmissions(): void {
    let filteredSubmissions = this.submissions;

    if (this.selectedDate) {
      filteredSubmissions = filteredSubmissions.filter(sub => 
        this.formatDateForComparison(sub.submittedAt) === this.selectedDate
      );
    }

    if (this.selectedChecklistForPrint) {
      filteredSubmissions = filteredSubmissions.filter(sub => 
        sub.checkListId === this.selectedChecklistForPrint
      );
    }

    if (filteredSubmissions.length === 0) {
      alert('Aucune soumission trouvée avec les critères sélectionnés');
      return;
    }

    if (filteredSubmissions.length === 1) {
      this.printSubmission(filteredSubmissions[0]);
    } else {
      this.printMultipleSubmissions(filteredSubmissions);
    }
  }

  printMultipleSubmissions(submissions: SubmissionWithDetails[]): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour l\'impression');
      return;
    }

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Consolidé des Checklists</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 3px solid #2c3e50; padding-bottom: 15px; }
          .submission { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; page-break-inside: avoid; }
          .submission-header { background: #f8f9fa; padding: 10px; border-radius: 3px; margin-bottom: 10px; }
          .stats { display: flex; gap: 15px; margin: 10px 0; flex-wrap: wrap; }
          .stat { padding: 5px 10px; border-radius: 3px; font-size: 12px; }
          @media print {
            body { margin: 10px; }
            .submission { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport Consolidé des Checklists</h1>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
          <p>Nombre de soumissions : ${submissions.length}</p>
        </div>
    `;

    submissions.forEach((submission, index) => {
      const counts = this.countResponsesByType(submission);
      const status = this.getSubmissionStatus(submission);
      
      content += `
        <div class="submission">
          <div class="submission-header">
            <h3>${submission.checklistName || 'Checklist sans nom'} - ${this.formatDate(submission.submittedAt)}</h3>
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
          ${this.generateSubmissionContent(submission)}
        </div>
      `;
    });

    content += `
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ Imprimer le rapport consolidé
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            ❌ Fermer
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }

  formatDateForComparison(dateString: string): string {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('❌ Erreur formatage date pour comparaison:', dateString, error);
      return '';
    }
  }

  // === AUTRES MÉTHODES EXISTANTES ===

  filterChecklists(): void {
    if (!this.searchTerm.trim()) {
      this.filteredChecklists = [...this.checklists];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    
    this.filteredChecklists = this.checklists.filter(checklist => 
      checklist.libelle.toLowerCase().includes(searchLower) ||
      (checklist.etapes || []).some(etape => 
        etape.nom.toLowerCase().includes(searchLower) ||
        (etape.questions || []).some(question => 
          question.texte.toLowerCase().includes(searchLower)
        )
      )
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredChecklists = [...this.checklists];
  }

  getTotalQuestions(checklist: CheckListFrontend): number {
    return (checklist.etapes || []).reduce((total, etape) => total + (etape.questions || []).length, 0);
  }

  getTotalEtapes(checklist: CheckListFrontend): number {
    return (checklist.etapes || []).length;
  }

  viewChecklistDetail(checklistId: number): void {
    this.router.navigate(['/checklists', checklistId]);
  }

  editChecklist(checklistId: number): void {
    this.router.navigate(['/checklists', checklistId, 'edit']);
  }

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
    if (checklist.etapes) {
      checklist.etapes.splice(index, 1);
      checklist.etapes.forEach((etape, idx) => {
        etape.ordre = idx;
      });
    }
  }

  updateEtapeNom(etape: EtapeFrontend, value: string) {
    etape.nom = value;
  }

  addQuestion(etape: EtapeFrontend) {
    if (!etape.questions) etape.questions = [];
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
    if (etape.questions) {
      etape.questions.splice(index, 1);
      etape.questions.forEach((question, idx) => {
        question.ordre = idx;
      });
    }
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
    if (!question.options) question.options = [];
    question.options.push({ valeur: '' });
  }

  removeOption(question: QuestionFrontend, index: number) {
    if (question.options) {
      question.options.splice(index, 1);
    }
  }

  getBooleanOptions(q: QuestionFrontend): string[] {
    return q.type === 'BooleanNA' ? ['Oui', 'Non', 'N/A'] : ['Oui', 'Non'];
  }

  saveChecklist(checklist: CheckListFrontend) {
    const createPayload: CreateCheckListDto = {
      libelle: checklist.libelle,
      etapes: (checklist.etapes || []).map((etape, etapeIndex) => ({
        nom: etape.nom,
        ordre: etape.ordre ?? etapeIndex,
        questions: (etape.questions || []).map((question, questionIndex) => {
          const options: CreateResponseOptionDto[] = (question.options || []).map((option, optionIndex) => ({
            texte: option.valeur,
            valeur: option.valeur,
            ordre: optionIndex
          }));

          return {
            libelle: question.texte,
            type: question.type,
            ordre: question.ordre ?? questionIndex,
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
              etapes: (res.etapes || []).map((e, etapeIndex) => ({
                id: e.id,
                nom: e.nom,
                ordre: this.getSafeOrdre(e) ?? etapeIndex,
                questions: (e.questions || []).map((q, questionIndex) => ({
                  id: q.id,
                  texte: q.texte,
                  type: q.type as QuestionFrontend['type'],
                  options: (q.options || []).map(o => ({ id: o.id, valeur: o.valeur })),
                  reponse: '',
                  ordre: this.getSafeOrdre(q) ?? questionIndex
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
        alert('Erreur lors de la suppression de la checklist');
      }
    });
  }

  createNewChecklist(): void {
    this.router.navigate(['/checklists/new']);
  }
}