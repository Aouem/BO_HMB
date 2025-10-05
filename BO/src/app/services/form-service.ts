import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckListDto, CreateCheckListDto, FormResponseDto, FormSubmissionDto, QuestionDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FormService {

  private baseUrl = `${environment.apiUrl}/Question`;
  private formApi = `${environment.apiUrl}/Form`;
  private checkListApi = `${environment.apiUrl}/CheckList`; // API pour les checklists

  constructor(private http: HttpClient) { }

  // ========== QUESTION METHODS ==========
  getQuestionsByChecklist(checklistId: number): Observable<QuestionDto[]> {
    return this.http.get<QuestionDto[]>(`${this.baseUrl}/by-checklist/${checklistId}`);
  }

  getQuestionsByEtape(etapeId: number): Observable<QuestionDto[]> {
    return this.http.get<QuestionDto[]>(`${this.baseUrl}/by-etape/${etapeId}`);
  }

  getQuestionById(questionId: number): Observable<QuestionDto> {
    return this.http.get<QuestionDto>(`${this.baseUrl}/${questionId}`);
  }

  createQuestion(question: QuestionDto): Observable<QuestionDto> {
    return this.http.post<QuestionDto>(this.baseUrl, question);
  }

  updateQuestion(questionId: number, question: QuestionDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${questionId}`, question);
  }

  deleteQuestion(questionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${questionId}`);
  }

  // ========== FORM SUBMISSION METHODS ==========
 // ========== FORM SUBMISSION METHODS ==========
  submitForm(formData: FormResponseDto): Observable<FormSubmissionDto> {
    // ✅ CORRECTION CRITIQUE : S'assurer que tous les champs sont définis
    const completePayload: any = {
      checkListId: formData.checkListId,
      reponses: formData.reponses || [],
      submittedBy: formData.submittedBy || this.getCurrentUser(),
      submittedAt: formData.submittedAt || new Date().toISOString(),
      decisionFinale: formData.decisionFinale || '', // ✅ FORCER la valeur même si undefined
      consequence: formData.consequence || ''         // ✅ FORCER la valeur même si undefined
    };

    // ✅ DEBUG COMPLET avec vérification de chaque champ
    console.log('🔍🔄 DEBUG CRITIQUE FORM SERVICE - Payload créé:', {
      checkListId: completePayload.checkListId,
      nbReponses: completePayload.reponses.length,
      reponses: completePayload.reponses,
      decisionFinale: completePayload.decisionFinale,
      consequence: completePayload.consequence,
      submittedBy: completePayload.submittedBy,
      submittedAt: completePayload.submittedAt,
      // Vérifier la structure exacte
      payloadStructure: Object.keys(completePayload),
      payloadJSON: JSON.stringify(completePayload)
    });

    return this.http.post<FormSubmissionDto>(`${this.formApi}/submit`, completePayload).pipe(
      tap(response => {
        console.log('✅🔄 DEBUG FORM SERVICE - Réponse API reçue:', {
          submissionId: response.id,
          reponsesCount: response.reponses?.length || 0,
          decisionFinale: response.decisionFinale,  // ← VÉRIFIER SI REMPLI
          consequence: response.consequence,        // ← VÉRIFIER SI REMPLI
          responseComplete: response
        });
      }),
      catchError(error => {
        console.error('❌🔄 DEBUG FORM SERVICE - Erreur détaillée:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        return throwError(() => new Error(`Erreur lors de la soumission: ${error.message}`));
      })
    );
  }

  getFormSubmissions(checklistId: number): Observable<FormSubmissionDto[]> {
    console.log('🔄 Chargement submissions pour checklist:', checklistId);
    
    return this.http.get<FormSubmissionDto[]>(`${this.formApi}/submissions`, {
      params: { checkListId: checklistId.toString() }
    }).pipe(
      tap(submissions => {
        console.log(`✅ ${submissions.length} soumissions reçues pour checklist ${checklistId}:`);
        submissions.forEach((sub, index) => {
          console.log(`  📄 Soumission ${index + 1}:`, {
            id: sub.id,
            reponses: sub.reponses?.length || 0,
            decisionFinale: sub.decisionFinale,
            consequence: sub.consequence,
            submittedAt: sub.submittedAt
          });
        });
      }),
      catchError(error => {
        console.error('❌ Erreur lors du chargement des soumissions:', error);
        return of([]);
      })
    );
  }



  getFormSubmissionById(submissionId: number): Observable<FormSubmissionDto> {
    return this.http.get<FormSubmissionDto>(`${this.formApi}/submissions/${submissionId}`);
  }

  // ========== CHECKLIST METHODS ==========
  createCheckList(dto: CreateCheckListDto): Observable<CheckListDto> {
    return this.http.post<CheckListDto>(`${this.checkListApi}/with-etapes`, dto);
  }

  getAllCheckLists(): Observable<CheckListDto[]> {
    return this.http.get<CheckListDto[]>(this.checkListApi);
  }

  getCheckListById(id: number): Observable<CheckListDto> {
    return this.http.get<CheckListDto>(`${this.checkListApi}/${id}`);
  }

  updateCheckList(id: number, checklist: CheckListDto): Observable<void> {
    return this.http.put<void>(`${this.checkListApi}/${id}`, checklist);
  }

  deleteCheckList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.checkListApi}/${id}`);
  }

  // ========== UTILITY METHODS ==========
  private getCurrentUser(): string {
    return localStorage.getItem('currentUser') || 'utilisateur_anonyme';
  }

  // Méthode pour vider le cache local des progressions
  clearLocalProgress(checklistId: number): void {
    localStorage.removeItem(`checklist_${checklistId}_progress`);
  }

  // Méthode pour obtenir toutes les soumissions (sans filtre)
  getAllSubmissions(): Observable<FormSubmissionDto[]> {
    return this.http.get<FormSubmissionDto[]>(`${this.formApi}/submissions`).pipe(
      catchError(error => {
        console.error('❌ Erreur lors du chargement de toutes les soumissions:', error);
        return of([]);
      })
    );
  }
  
}