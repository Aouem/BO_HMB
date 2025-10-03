// check-list-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of, forkJoin, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckListDto, CreateCheckListDto, EtapeDto, FormResponseDto, FormSubmissionDto, QuestionDto, QuestionResponseDto } from '../models';

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
  private formApi = `${environment.apiUrl}/Form`;

  constructor(private http: HttpClient) {}

  // ===== CheckList CRUD =====
  getCheckList(id: number): Observable<CheckListDto> {
    return this.http.get<CheckListDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur chargement checklist ${id}:`, error);
        return throwError(() => new Error('Erreur lors du chargement de la checklist'));
      })
    );
  }

  getAllCheckLists(): Observable<CheckListDto[]> {
    return this.http.get<CheckListDto[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('❌ Erreur chargement des checklists:', error);
        return of([]);
      })
    );
  }

  createCheckList(dto: CreateCheckListDto): Observable<CheckListDto> {
    return this.http.post<CheckListDto>(`${this.apiUrl}/with-etapes`, dto).pipe(
      catchError(error => {
        console.error('❌ Erreur création checklist:', error);
        return throwError(() => new Error('Erreur lors de la création de la checklist'));
      })
    );
  }

  updateCheckList(id: number, dto: CreateCheckListDto): Observable<CheckListDto> {
    return this.http.put<CheckListDto>(`${this.apiUrl}/${id}`, dto).pipe(
      catchError(error => {
        console.error(`❌ Erreur mise à jour checklist ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la mise à jour de la checklist'));
      })
    );
  }

  deleteCheckList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`❌ Erreur suppression checklist ${id}:`, error);
        return throwError(() => new Error('Erreur lors de la suppression de la checklist'));
      })
    );
  }

  // ===== Soumissions =====

  /** Enregistrer une soumission */
  submitChecklist(payload: FormResponseDto): Observable<FormSubmissionDto> {
    const completePayload = {
      ...payload,
      submittedAt: payload.submittedAt || new Date().toISOString(),
      submittedBy: payload.submittedBy || this.getCurrentUser()
    };
    
    console.log('📤 Soumission checklist:', completePayload);
    
    return this.http.post<FormSubmissionDto>(`${this.formApi}/submit`, completePayload).pipe(
      catchError(error => {
        console.error('❌ Erreur soumission checklist:', error);
        return throwError(() => new Error('Erreur lors de la soumission du formulaire'));
      })
    );
  }

  /** Lire les soumissions horodatées d'une checklist */
/** Lire les soumissions horodatées d'une checklist */
getChecklistSubmissions(checklistId: number): Observable<FormSubmissionDto[]> {
  console.log('🔄 Chargement soumissions pour checklist:', checklistId);
  
  return this.http.get<FormSubmissionDto[]>(`${this.formApi}/submissions`, {
    params: { checkListId: checklistId.toString() }
  }).pipe(
    map((submissions: FormSubmissionDto[]) => {
      if (!submissions || !Array.isArray(submissions)) {
        console.warn('⚠️ Réponse invalide du serveur, utilisation de tableau vide');
        return [];
      }
      
      console.log(`✅ ${submissions.length} soumissions trouvées pour checklist ${checklistId}`);
      return submissions;
    }),
    catchError(error => {
      console.error('❌ Erreur chargement soumissions:', error);
      return of([]);
    })
  );
}

  getLatestSubmission(checklistId: number): Observable<FormSubmissionDto | null> {
    return this.getChecklistSubmissions(checklistId).pipe(
      map(submissions => submissions.length > 0 ? submissions[0] : null)
    );
  }

  private getCurrentUser(): string {
    return localStorage.getItem('currentUser') || 'utilisateur_anonyme';
  }

  /** Récupérer les questions avec réponses courantes */
  getLatestAnswers(checklistId: number): Observable<QuestionDto[]> {
    console.log('🔄 Chargement réponses courantes pour checklist:', checklistId);

    const tryA$ = this.http
      .get<QuestionDto[]>(`${environment.apiUrl}/Question/by-checklist/${checklistId}`)
      .pipe(
        catchError(() => {
          console.log('⚠️ Method A failed, trying next...');
          return of([]);
        })
      );

    const tryB$ = this.http
      .get<QuestionDto[]>(`${environment.apiUrl}/Question`, { 
        params: new HttpParams().set('checkListId', checklistId.toString()) 
      })
      .pipe(
        catchError(() => {
          console.log('⚠️ Method B failed, trying next...');
          return of([]);
        })
      );

    const tryC$ = this.http
      .get<QuestionDto[]>(`${this.apiUrl}/${checklistId}/questions`)
      .pipe(
        catchError(() => {
          console.log('⚠️ Method C failed');
          return of([]);
        })
      );

    return tryA$.pipe(
      switchMap(a => {
        if (a?.length > 0) {
          console.log('✅ Réponses trouvées avec méthode A');
          return of(a);
        }
        return tryB$;
      }),
      switchMap(b => {
        if (b?.length > 0) {
          console.log('✅ Réponses trouvées avec méthode B');
          return of(b);
        }
        return tryC$;
      }),
      map(questions => {
        console.log(`📊 ${questions.length} questions chargées`);
        return questions;
      })
    );
  }

  /** Agrégat: Checklist + Étapes + Questions + submissions[] */
  getChecklistWithSubmissions(checklistId: number): Observable<AggregatedChecklistDto> {
    console.log('🔄 Chargement checklist agrégée:', checklistId);
    
    return this.getCheckList(checklistId).pipe(
      switchMap((cl) => {
        if (!cl) {
          throw new Error('Checklist non trouvée');
        }

        // Squelette de la checklist agrégée
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
            questions: (e.questions || []).map(q => ({ 
              ...q, 
              submissions: [] 
            }))
          }))
        };

        // Index questionId -> référence
        const qIndex = new Map<number, QuestionDto & { submissions: QuestionSubmission[] }>();
        aggregated.etapes.forEach(et =>
          et.questions.forEach(q => { 
            if (q.id != null) qIndex.set(q.id, q); 
          })
        );

        console.log(`📋 ${qIndex.size} questions indexées`);

        return forkJoin({
          subs: this.getChecklistSubmissions(checklistId),
          answers: this.getLatestAnswers(checklistId)
        }).pipe(
          map(({ subs, answers }) => {
            // Injecte les soumissions historiques
            if (subs?.length > 0) {
              console.log(`🔄 Injection de ${subs.length} soumissions`);
              for (const s of subs) {
                for (const r of (s.reponses || [])) {
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

            // Fallback: pas d'historique → réponses courantes
            const hasAny = Array.from(qIndex.values()).some(q => q.submissions.length > 0);
            if (!hasAny && answers?.length > 0) {
              console.log(`🔄 Utilisation des réponses courantes (${answers.length})`);
              for (const a of answers) {
                if (!a?.id) continue;
                const tgt = qIndex.get(a.id);
                const val = (a?.reponse ?? '').trim();
                if (tgt && val) {
                  tgt.submissions.push({ 
                    reponse: val 
                  });
                }
              }
            }

            // Statistiques finales
            const totalSubmissions = Array.from(qIndex.values())
              .reduce((sum, q) => sum + q.submissions.length, 0);
            console.log(`✅ Checklist agrégée chargée: ${totalSubmissions} réponses totales`);

            return aggregated;
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur chargement checklist agrégée:', error);
        return throwError(() => new Error('Erreur lors du chargement de la checklist avec historique'));
      })
    );
  }

  // ===== Méthodes utilitaires =====
  
  /** Vérifier si une checklist a des soumissions */
  hasSubmissions(checklistId: number): Observable<boolean> {
    return this.getChecklistSubmissions(checklistId).pipe(
      map(submissions => submissions.length > 0)
    );
  }

  /** Compter le nombre de soumissions */
  countSubmissions(checklistId: number): Observable<number> {
    return this.getChecklistSubmissions(checklistId).pipe(
      map(submissions => submissions.length)
    );
  }

  /** Nettoyer le cache local des progressions */
  clearLocalProgress(checklistId: number): void {
    localStorage.removeItem(`checklist_${checklistId}_progress`);
    console.log('🧹 Cache local nettoyé pour checklist:', checklistId);
  }
}