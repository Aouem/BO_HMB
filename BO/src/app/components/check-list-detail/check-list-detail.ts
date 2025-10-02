// ...imports existants...
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CheckListService, AggregatedChecklistDto, QuestionSubmission } from '../../services/check-list-service';

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

  constructor(
    private route: ActivatedRoute,
    private checklists: CheckListService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? +idParam : 0;

    if (!id) {
      this.errorMsg = 'Aucun ID de checklist trouvé dans l’URL';
      this.loading = false;
      return;
    }

    this.checklists.getChecklistWithSubmissions(id).subscribe({
      next: (agg) => { this.agg = agg; this.loading = false; },
      error: (err) => {
        console.error('Erreur checklist', err);
        this.errorMsg = 'Impossible de charger la checklist.';
        this.loading = false;
      }
    });
  }

  // ---------- Résumé / comptages ----------
  get hasRealSubmissions(): boolean {
    if (!this.agg) return false;
    return this.agg.etapes.some(et =>
      et.questions.some(q => q.submissions?.some(s => s.submissionId != null))
    );
  }

  get headerCountLabel(): string {
    return this.hasRealSubmissions ? 'soumission(s)' : 'réponse(s)';
  }

  get totalSubmissions(): number {
    if (!this.agg) return 0;
    const submissionIds = new Set<number>();
    let pseudoCount = 0;

    this.agg.etapes.forEach(et =>
      et.questions.forEach(q => {
        if (!q.submissions?.length) return;
        q.submissions.forEach(s => {
          if (s.submissionId != null) submissionIds.add(s.submissionId);
        });
        if (q.submissions.length && q.submissions.every(s => s.submissionId == null)) {
          pseudoCount += 1; // 1 “réponse courante” par question
        }
      })
    );

    return submissionIds.size > 0 ? submissionIds.size : pseudoCount;
  }

  // ---------- Helpers d’affichage ----------
  private norm(v?: string): string {
    const x = (v || '').trim();
    if (!x) return '';
    if (x.toUpperCase() === 'N/A' || x.toUpperCase() === 'NA') return 'N/A';
    if (x.toLowerCase() === 'oui') return 'Oui';
    if (x.toLowerCase() === 'non') return 'Non';
    return x;
  }

  latest(q: AggQuestion): QuestionSubmission | undefined {
    if (!q?.submissions?.length) return undefined;

    // Si au moins une soumission a une date → on prend la plus récente
    const withDate = q.submissions.filter(s => !!s.submittedAt);
    if (withDate.length) {
      return withDate.sort(
        (a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime()
      )[0];
    }

    // Sinon on retourne la dernière (fallback)
    return q.submissions[q.submissions.length - 1];
  }

  isLatest(q: AggQuestion, expected: 'Oui' | 'Non' | 'N/A'): boolean {
    const last = this.latest(q);
    return this.norm(last?.reponse) === expected;
  }

  badgeClass(val?: string) {
    const v = this.norm(val);
    if (v === 'Oui') return 'ans-badge badge-oui';
    if (v === 'Non') return 'ans-badge badge-non';
    if (v === 'N/A') return 'ans-badge badge-na';
    return 'ans-badge';
  }

  // Tableau “Toutes les soumissions” (à plat), trié par date décroissante
  get flatSubmissions() {
    if (!this.agg) return [];
    const rows: Array<{
      submissionId?: number;
      submittedAt?: string;
      submittedBy?: string;
      etape: string;
      question: string;
      reponse: string;
    }> = [];

    for (const et of this.agg.etapes) {
      for (const q of et.questions) {
        for (const s of (q.submissions || [])) {
          rows.push({
            submissionId: s.submissionId,
            submittedAt: s.submittedAt,
            submittedBy: s.submittedBy,
            etape: et.nom,
            question: q.texte,
            reponse: this.norm(s.reponse)
          });
        }
      }
    }

    // Tri par date (les lignes sans date passent en bas)
    rows.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return tb - ta;
    });

    return rows;
  }

  // ---------- trackBy ----------
  trackByEt = (_: number, et: any) => et.id ?? _;
  trackByQ  = (_: number, q: any)  => q.id ?? _;
  trackByS  = (_: number, s: any)  => s.submissionId ?? _;
  trackByFlat = (_: number, r: any) => (r.submissionId ?? '') + '|' + (r.submittedAt ?? '') + '|' + r.question;
}
