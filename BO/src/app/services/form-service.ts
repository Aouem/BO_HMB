import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // <-- importer l'environnement
import { CheckListDto, CreateCheckListDto, FormResponseDto, FormSubmissionDto, QuestionDto } from '../models';


@Injectable({
  providedIn: 'root'
})
export class FormService {

  private baseUrl = `${environment.apiUrl}/Question`; // <-- utilisation de environment.apiUrl
  private formApi = `${environment.apiUrl}/Form`; // Ajouter pour les soumissions

  constructor(private http: HttpClient) { }

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

  submitForm(formData: FormResponseDto): Observable<FormSubmissionDto> {
    // Utiliser le endpoint Form pour les soumissions
    return this.http.post<FormSubmissionDto>(`${this.formApi}/submit`, {
      ...formData,
      submittedAt: formData.submittedAt || new Date().toISOString(),
      submittedBy: formData.submittedBy || this.getCurrentUser()
    });
  }
    getFormSubmissions(checklistId: number): Observable<FormSubmissionDto[]> {
    return this.http.get<FormSubmissionDto[]>(`${this.formApi}/submissions`, {
      params: { checkListId: checklistId.toString() }
    });
  }

  private getCurrentUser(): string {
    return localStorage.getItem('currentUser') || 'utilisateur_anonyme';
  }
  
// Dans CheckListService
createCheckList(dto: CreateCheckListDto): Observable<CheckListDto> {
  return this.http.post<CheckListDto>(`${this.baseUrl}/with-etapes`, dto);
}
}
