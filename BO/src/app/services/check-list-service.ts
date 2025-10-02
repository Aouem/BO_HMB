// check-list-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of, forkJoin, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CheckListDto, QuestionDto, EtapeDto,
  FormSubmissionDto, QuestionResponseDto, CreateCheckListDto, FormResponseDto
} from '../models';

// Attache des soumissions à chaque question
export interface QuestionSubmission {
  submissionId?: number;
  reponse: string;
  submittedAt?: string;
  submittedBy?: string;
}

// Vue agrégée prête à afficher
export type AggregatedChecklistDto =
  Omit<CheckListDto, 'etapes'> & {
    etapes: Array<
      Omit<EtapeDto, 'questions'> & {
        questions: Array<QuestionDto & { submissions: QuestionSubmission[] }>
      }
    >
  };

@Injectable({ providedIn: 'root' })
export class CheckListService {
  private apiUrl  = `${environment.apiUrl}/CheckList`;
  private formApi = `${environment.apiUrl}/Form`; // ✅ base “Form” (POST submit / GET submissions)

  constructor(private http: HttpClient) {}

  // ===== CheckList CRUD =====
  getCheckList(id: number): Observable<CheckListDto> {
    return this.http.get<CheckListDto>(`${this.apiUrl}/${id}`);
  }

  getAllCheckLists(): Observable<CheckListDto[]> {
    return this.http.get<CheckListDto[]>(this.apiUrl);
  }

  createCheckList(dto: CreateCheckListDto): Observable<CheckListDto> {
    return this.http.post<CheckListDto>(`${this.apiUrl}/with-etapes`, dto);
  }

  updateCheckList(id: number, dto: CreateCheckListDto): Observable<CheckListDto> {
    return this.http.put<CheckListDto>(`${this.apiUrl}/${id}`, dto);
  }

  deleteCheckList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ===== Soumissions =====

  /** Enregistrer une soumission (créera Id + date côté backend) */
  submitChecklist(payload: FormResponseDto): Observable<FormSubmissionDto> {
    return this.http.post<FormSubmissionDto>(`${this.formApi}/submit`, payload);
  }

  /** Lire les soumissions horodatées d’une checklist */
getChecklistSubmissions(checklistId: number): Observable<FormSubmissionDto[]> {
  const formApi = `${environment.apiUrl}/Form`;

  const params = new HttpParams().set('checkListId', String(checklistId));
  return this.http.get<FormSubmissionDto[]>(`${formApi}/submissions`, { params }).pipe(
    // Écarter les soumissions sans réponses (comme id=1 dans ton exemple)
    map(list => (list ?? []).filter(s => (s.reponses?.length ?? 0) > 0)),
    // Trier de la plus récente à la plus ancienne
    map(list =>
      list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
    )
  );
}


  /** Fallback: lire les “réponses courantes” question par question si pas d’historique */
  getLatestAnswers(checklistId: number): Observable<QuestionDto[]> {
    const tryA$ = this.http
      .get<QuestionDto[]>(`${environment.apiUrl}/Question/by-checklist/${checklistId}`)
      .pipe(catchError(() => of([])));

    const params = new HttpParams().set('checkListId', String(checklistId));
    const tryB$ = this.http
      .get<QuestionDto[]>(`${environment.apiUrl}/Question`, { params })
      .pipe(catchError(() => of([])));

    const tryC$ = this.http
      .get<QuestionDto[]>(`${this.apiUrl}/${checklistId}/questions`)
      .pipe(catchError(() => of([])));

    return tryA$.pipe(
      switchMap(a => a?.length ? of(a) : tryB$),
      switchMap(b => b?.length ? of(b) : tryC$)
    );
  }

  /** Agrégat: Checklist + Étapes + Questions + submissions[] */
  getChecklistWithSubmissions(checklistId: number): Observable<AggregatedChecklistDto> {
    return this.getCheckList(checklistId).pipe(
      switchMap((cl) => {
        // Squelette
        const aggregated: AggregatedChecklistDto = {
          id: cl.id,
          libelle: cl.libelle,
          version: cl.version,
          description: cl.description,
          etapes: (cl.etapes || []).map(e => ({
            id: e.id,
            nom: e.nom,
            ordre: e.ordre,
            estValidee: e.estValidee,
            questions: (e.questions || []).map(q => ({ ...q, submissions: [] }))
          }))
        };

        // Index questionId -> ref
        const qIndex = new Map<number, QuestionDto & { submissions: QuestionSubmission[] }>();
        aggregated.etapes.forEach(et =>
          et.questions.forEach(q => { if (q.id != null) qIndex.set(q.id, q); })
        );

        return forkJoin({
          subs: this.getChecklistSubmissions(checklistId).pipe(catchError(() => of([] as FormSubmissionDto[]))),
          answers: this.getLatestAnswers(checklistId).pipe(catchError(() => of([] as QuestionDto[])))
        }).pipe(
          map(({ subs, answers }) => {
            // Injecte les vraies soumissions
            if (subs?.length) {
              for (const s of subs) {
                for (const r of (s.reponses || [] as QuestionResponseDto[])) {
                  const tgt = qIndex.get(r.questionId);
                  if (!tgt) continue;
                  tgt.submissions.push({
                    submissionId: s.id,
                    reponse: r.reponse ?? '',
                    submittedAt: s.submittedAt,
                    submittedBy: s.submittedBy
                  });
                }
              }
            }

            // Fallback: pas d’historique → réponses courantes
            const hasAny = Array.from(qIndex.values()).some(q => q.submissions.length > 0);
            if (!hasAny && answers?.length) {
              for (const a of answers) {
                if (!a?.id) continue;
                const tgt = qIndex.get(a.id);
                const val = (a?.reponse ?? '').trim();
                if (tgt && val) tgt.submissions.push({ reponse: val });
              }
            }

            return aggregated;
          })
        );
      })
    );
  }
}
