// checklist-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CheckListService, AggregatedChecklistDto, QuestionSubmission } from '../../services/check-list-service';

interface SubmissionDetail {
  id: number;
  checkListId: number;
  submittedBy: string;
  submittedAt: string;
  reponses: QuestionResponse[];
  showDetails?: boolean;
}

interface QuestionResponse {
  questionId: number;
  questionText: string;
  reponse: string;
  etapeName: string;
}

type AggQuestion = AggregatedChecklistDto['etapes'][number]['questions'][number];

@Component({
  selector: 'app-checklist-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checklist-detail.html',
  styleUrls: ['./checklist-detail.css']
})
export class CheckListDetailComponent implements OnInit {
  loading = true;
  errorMsg = '';
  agg: AggregatedChecklistDto | null = null;
  submissions: SubmissionDetail[] = [];
  selectedSubmission: SubmissionDetail | null = null;

  constructor(
    private route: ActivatedRoute,
    private checklists: CheckListService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : 0;

    if (!id) {
      this.errorMsg = 'Aucun ID de checklist trouvé dans l\'URL';
      this.loading = false;
      return;
    }

    this.checklists.getChecklistWithSubmissions(id).subscribe({
      next: (agg) => { 
        this.agg = agg;
        this.processSubmissions(agg);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur checklist', err);
        this.errorMsg = 'Impossible de charger la checklist.';
        this.loading = false;
      }
    });
  }

  private processSubmissions(agg: AggregatedChecklistDto): void {
    const submissionMap = new Map<number, SubmissionDetail>();

    // Parcourir toutes les étapes et questions pour regrouper par soumission
    agg.etapes.forEach(etape => {
      etape.questions.forEach(question => {
        question.submissions?.forEach(submission => {
          if (submission.submissionId) {
            if (!submissionMap.has(submission.submissionId)) {
              submissionMap.set(submission.submissionId, {
                id: submission.submissionId,
                checkListId: agg.id,
                submittedBy: submission.submittedBy || 'Utilisateur inconnu',
                submittedAt: submission.submittedAt || '',
                reponses: []
              });
            }

            const submissionDetail = submissionMap.get(submission.submissionId)!;
            submissionDetail.reponses.push({
              questionId: question.id,
              questionText: question.texte,
              reponse: submission.reponse || 'Non répondu',
              etapeName: etape.nom
            });
          }
        });
      });
    });

    // Convertir la Map en tableau et trier par date (plus récent en premier)
    this.submissions = Array.from(submissionMap.values()).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  // Afficher les détails d'une soumission
  showSubmissionDetails(submission: SubmissionDetail): void {
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

  // Obtenir la classe CSS pour une réponse
  getAnswerClass(reponse: string): string {
    const reponseLower = reponse.toLowerCase();
    if (reponseLower.includes('oui')) return 'answer-yes';
    if (reponseLower.includes('non')) return 'answer-no';
    if (reponseLower.includes('n/a') || reponseLower.includes('na')) return 'answer-na';
    return 'answer-text';
  }

  // Compter les réponses par type pour une soumission
  countResponsesByType(submission: SubmissionDetail): { oui: number, non: number, na: number, texte: number } {
    const counts = { oui: 0, non: 0, na: 0, texte: 0 };
    
    submission.reponses.forEach(response => {
      const reponse = response.reponse.toLowerCase();
      if (reponse.includes('oui')) counts.oui++;
      else if (reponse.includes('non')) counts.non++;
      else if (reponse.includes('n/a') || reponse.includes('na')) counts.na++;
      else if (reponse.trim() !== '' && reponse !== 'non répondu') counts.texte++;
    });
    
    return counts;
  }

  // Obtenir le statut de la soumission
  getSubmissionStatus(submission: SubmissionDetail): { class: string, text: string } {
    const totalQuestions = submission.reponses.length;
    const answeredQuestions = submission.reponses.filter(r => 
      r.reponse && r.reponse.trim() !== '' && !r.reponse.toLowerCase().includes('non répondu')
    ).length;
    
    if (answeredQuestions === 0) return { class: 'status-empty', text: 'Vide' };
    if (answeredQuestions === totalQuestions) return { class: 'status-complete', text: 'Complète' };
    return { class: 'status-partial', text: 'Partielle' };
  }

  // ---------- Résumé / comptages ----------
  get hasRealSubmissions(): boolean {
    return this.submissions.length > 0;
  }

  // Ajoutez cette méthode dans la classe CheckListDetailComponent
getGroupedResponses(submission: SubmissionDetail): any[] {
  const grouped: { [key: string]: { name: string; responses: QuestionResponse[] } } = {};
  
  submission.reponses.forEach(response => {
    if (!grouped[response.etapeName]) {
      grouped[response.etapeName] = {
        name: response.etapeName,
        responses: []
      };
    }
    grouped[response.etapeName].responses.push(response);
  });
  
  return Object.values(grouped);
}

  get totalSubmissions(): number {
    return this.submissions.length;
  }

  // ---------- trackBy ----------
  trackBySubmission = (_: number, submission: SubmissionDetail) => submission.id;
  trackByResponse = (_: number, response: QuestionResponse) => response.questionId;
}