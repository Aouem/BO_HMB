import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of, forkJoin, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckListDto, CreateCheckListDto, EtapeDto, FormResponseDto, FormSubmissionDto, QuestionDto, QuestionResponseDto } from '../models';
import { tap } from 'rxjs/operators';
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
    console.log(`🔍 Chargement détaillé de la checklist ID: ${id}`);
    return this.http.get<CheckListDto>(`${this.apiUrl}/${id}`).pipe(
      tap(checklist => {
        console.log(`✅ Checklist ${id} chargée: "${checklist.libelle}"`);
        console.log(`📋 Détails des étapes:`);
        
        if (!checklist.etapes || checklist.etapes.length === 0) {
          console.warn(`⚠️  Aucune étape trouvée pour la checklist ${id}`);
        } else {
          checklist.etapes.forEach((etape, index) => {
            console.log(`   Étape ${index + 1}: "${etape.nom}" - ${etape.questions?.length || 0} questions`);
            if (etape.questions && etape.questions.length > 0) {
              etape.questions.forEach((question, qIndex) => {
                console.log(`      Q${qIndex + 1}: "${question.texte}" (ID: ${question.id})`);
              });
            }
          });
        }
      }),
      catchError(error => {
        console.error(`❌ Erreur chargement checklist ${id}:`, error);
        return throwError(() => new Error('Erreur lors du chargement de la checklist'));
      })
    );
  }

  getAllCheckLists(): Observable<CheckListDto[]> {
    console.log('🔄 Chargement de toutes les checklists...');
    return this.http.get<CheckListDto[]>(this.apiUrl).pipe(
      tap(checklists => {
        console.log(`✅ ${checklists.length} checklists chargées avec succès`);
        checklists.forEach((checklist, index) => {
          console.log(`   ${index + 1}. "${checklist.libelle}" (ID: ${checklist.id}) - ${checklist.etapes?.length || 0} étapes`);
        });
      }),
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

// Dans check-list-service.ts
updateCheckList(id: number, dto: CreateCheckListDto): Observable<CheckListDto> {
  console.log('📤 Envoi mise à jour checklist:', {
    id: id,
    payload: dto
  });

  return this.http.put<CheckListDto>(`${this.apiUrl}/${id}`, dto).pipe(
    tap(response => {
      console.log('✅ Réponse serveur mise à jour:', response);
    }),
    catchError(error => {
      console.error('❌ Erreur détaillée serveur:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error,
        message: error.message
      });
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
  
  // DEBUG DÉTAILLÉ
  console.log('🔍 DEBUG ANGULAR SUBMIT - Avant envoi:', {
    checkListId: completePayload.checkListId,
    nbReponses: completePayload.reponses?.length || 0,
    reponses: completePayload.reponses,
    submittedBy: completePayload.submittedBy,
    payloadComplet: completePayload
  });
  
  if (completePayload.reponses && completePayload.reponses.length > 0) {
    completePayload.reponses.forEach((reponse, index) => {
      console.log(`  📝 Réponse ${index + 1}:`, {
        questionId: reponse.questionId,
        reponse: reponse.reponse
      });
    });
  } else {
    console.log('❌ DEBUG ANGULAR: reponses est VIDE!', {
      estNull: completePayload.reponses === null,
      estUndefined: completePayload.reponses === undefined,
      estTableauVide: Array.isArray(completePayload.reponses) && completePayload.reponses.length === 0
    });
  }
  
  return this.http.post<FormSubmissionDto>(`${this.formApi}/submit`, completePayload).pipe(
    tap(response => {
      console.log('✅ DEBUG ANGULAR: Réponse API reçue:', {
        submissionId: response.id,
        nbReponsesSauvegardees: response.reponses.length,
        reponses: response.reponses
      });
    }),
    catchError(error => {
      console.error('❌ DEBUG ANGULAR: Erreur soumission:', {
        error: error,
        status: error.status,
        message: error.message
      });
      return throwError(() => new Error('Erreur lors de la soumission du formulaire'));
    })
  );
}

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
// Dans la méthode getChecklistWithSubmissions, remplacer cette partie :


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
          // DEBUG: Vérifier le contenu des soumissions
          console.log('🔍 DEBUG - Contenu des soumissions:', subs);
          
          // Injecte les soumissions historiques
          if (subs?.length > 0) {
            console.log(`🔄 Injection de ${subs.length} soumissions`);
            for (const s of subs) {
              console.log(`📄 Soumission ${s.id}:`, {
                reponsesCount: s.reponses?.length || 0,
                reponses: s.reponses
              });
              
              for (const r of (s.reponses || [])) {
                console.log(`  ➡️ Réponse: QuestionID=${r.questionId}, Réponse="${r.reponse}"`);
                const tgt = qIndex.get(r.questionId);
                if (!tgt) {
                  console.warn(`  ⚠️ QuestionID ${r.questionId} non trouvée dans l'index`);
                  continue;
                }
                tgt.submissions.push({
                  submissionId: s.id,
                  reponse: r.reponse ?? '',
                  submittedAt: s.submittedAt,
                  submittedBy: s.submittedBy
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