// === INTERFACES DE BASE ===

export interface ResponseOptionDto {
  id: number;
  texte: string;
  valeur: string;
  ordre: number;
  questionId: number;
}

export interface QuestionDto {
  id: number;
  texte: string;
  type: 'Boolean' | 'BooleanNA' | 'Liste' | 'Texte';
  estObligatoire: boolean;
  reponse: string | null;
  commentaire: string | null;
  options: ResponseOptionDto[];
  etapeId: number;
  checkListId: number;
  checkListLibelle: string | null;
}

export interface EtapeDto {
  id: number;
  nom: string;
  ordre: number;
  estValidee: boolean;
  questions: QuestionDto[];
}

export interface CheckListDto {
  id: number;
  libelle: string;
  description?: string;
  version?: string;
  etapes: EtapeDto[];
}

// === INTERFACES POUR LES RÉPONSES ===

export interface QuestionResponseDto {
  questionId: number;
  reponse: string;
}

export interface FormResponseDto {
  checkListId: number;
  reponses: QuestionResponseDto[];
  submittedBy?: string;
  submittedAt?: string;
    decisionFinale?: string;  
  consequence?: string;    
}

export interface FormSubmissionDto {
  id: number;
  checkListId: number;
  submittedBy: string;
  submittedAt: string;
  reponses: QuestionResponseDto[];
   decisionFinale?: string;  
  consequence?: string;    
}

// === INTERFACES POUR LA CRÉATION ===

export interface CreateResponseOptionDto {
  texte: string;
  valeur: string;
  ordre: number;
}

export interface CreateQuestionDto {
  libelle: string;
  type: string;
  ordre: number;
  estObligatoire?: boolean;
  options?: CreateResponseOptionDto[];
}

export interface CreateEtapeDto {
  nom: string;
  ordre: number;
  questions: CreateQuestionDto[];
}

export interface CreateCheckListDto {
  libelle: string;
  description?: string;
  version?: string;
  etapes: CreateEtapeDto[];
}

// === INTERFACES POUR LE FRONTEND (si nécessaires) ===

export interface CheckList {
  libelle: string;
  questions: Question[];
}

export interface Question {
  texte: string;
  type: 'Boolean' | 'BooleanNA' | 'Texte' | 'Liste';
  options?: ResponseOption[];
  hasNA?: boolean;
  reponse?: string;
  id?: number;
}

export interface QuestionWithResponse extends Question {}

export interface ResponseOption {
  valeur: string;
}

// === FONCTIONS UTILITAIRES ===

export function mapQuestionDtoToQuestion(q: QuestionDto): QuestionWithResponse {
  let strictType: Question['type'] = 'Boolean';
  if (q.type === 'Boolean' || q.type === 'BooleanNA' || q.type === 'Texte' || q.type === 'Liste') {
    strictType = q.type;
  }

  return {
    ...q,
    type: strictType,
    options: q.options || [],
    reponse: q.reponse || '',
    id: q.id
  };
}