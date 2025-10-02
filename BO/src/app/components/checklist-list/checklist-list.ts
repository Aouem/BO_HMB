import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CheckListService} from '../../services/check-list-service';
import { CheckListDto, CreateCheckListDto } from '../../models';

// --- Interfaces frontend ---
interface QuestionFrontend {
  id?: number;
  texte: string;
  type: 'Boolean' | 'BooleanNA' | 'Texte' | 'Liste';
  options: { id?: number; valeur: string }[];
  reponse?: string | null;
    height?: string;

}

interface EtapeFrontend {
  id?: number;
  nom: string;
  questions: QuestionFrontend[];
    height?: string;

}

interface CheckListFrontend {
  id?: number;
  libelle: string;
  etapes: EtapeFrontend[];
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

  constructor(
    private checklistService: CheckListService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadChecklists();
  }

  // --- Charger les checklists depuis le backend ---
  loadChecklists(): void {
    this.checklistService.getAllCheckLists().subscribe({
      next: (data: CheckListDto[]) => {
        this.checklists = data.map(cl => ({
          id: cl.id,
          libelle: cl.libelle,
          etapes: cl.etapes?.map(e => ({
            id: e.id,
            nom: e.nom,
            questions: e.questions?.map(q => ({
              id: q.id,
              texte: q.texte,
              type: ['Boolean', 'BooleanNA', 'Texte', 'Liste'].includes(q.type) ? q.type as QuestionFrontend['type'] : 'Boolean',
              options: q.options?.map(o => ({ id: o.id, valeur: o.valeur })) || [],
              reponse: ''
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
    checklist.etapes.push({
      id: 0,
      nom: '',
      questions: []
    });
  }

  removeEtape(checklist: CheckListFrontend, index: number) {
    checklist.etapes.splice(index, 1);
  }

  updateEtapeNom(etape: EtapeFrontend, value: string) {
    etape.nom = value;
  }

  // --- Questions ---
  addQuestion(etape: EtapeFrontend) {
    etape.questions.push({
      id: 0,
      texte: '',
      type: 'Boolean',
      options: [],
      reponse: ''
    });
  }

  removeQuestion(etape: EtapeFrontend, index: number) {
    etape.questions.splice(index, 1);
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
// --- Sauvegarder checklist ---
saveChecklist(checklist: CheckListFrontend) {
  // Préparer le payload pour CREATE (nouvelle checklist)
  const createPayload: CreateCheckListDto = {
    libelle: checklist.libelle,
    etapes: checklist.etapes.map(e => ({
      nom: e.nom,
      questions: e.questions.map(q => ({
        texte: q.texte,
        type: q.type,
        options: q.options.map(o => ({
          valeur: o.valeur
        })),
        reponse: q.reponse || undefined // Convertir null en undefined
      }))
    }))
  };

  if (checklist.id && checklist.id > 0) {
    // ✅ CORRECTION : Pour UPDATE, utiliser CreateCheckListDto avec l'ID dans l'URL
    this.checklistService.updateCheckList(checklist.id, createPayload).subscribe({
      next: (res: CheckListDto) => {
        console.log('Checklist mise à jour avec succès', res);
        
        const index = this.checklists.findIndex(cl => cl.id === checklist.id);
        if (index !== -1) {
          this.checklists[index] = {
            ...this.checklists[index],
            libelle: res.libelle,
            etapes: res.etapes.map(e => ({
              id: e.id,
              nom: e.nom,
              questions: e.questions.map(q => ({
                id: q.id,
                texte: q.texte,
                type: q.type as QuestionFrontend['type'],
                options: q.options.map(o => ({ id: o.id, valeur: o.valeur })),
                reponse: ''
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
    // Pour CREATE, utiliser directement createPayload
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

  // --- Nouveau handler pour contenteditable ---
  onBlurLibelle(event: Event, cl: any) {
    const target = event.target as HTMLElement | null;
    if (target) {
      cl.libelle = target.textContent || '';
    }
  }

  // --- Nouveau handler pour select type de question ---
  updateQuestionTypeSafe(question: QuestionFrontend, newType: string) {
    question.type = newType as QuestionFrontend['type'];
    if (newType !== 'Liste') question.options = [];
    if (!question.reponse) question.reponse = '';
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

  // Calculer la largeur d'un champ basée sur le contenu
 getInputWidth(value: string | undefined | null, minWidth: number = 200): string {
  return '100%'; // Toujours 100% de largeur
}

  // Calculer la largeur d'un select basée sur la valeur sélectionnée
  getSelectWidth(value: string | undefined | null, minWidth: number = 180): string {
    if (!value) return minWidth + 'px';
    
    const length = value.length;
    const calculatedWidth = Math.max(minWidth, length * 8 + 60);
    return Math.min(calculatedWidth, 400) + 'px';
  }

  // Calculer la largeur pour les champs contenteditable
getFieldWidth(value: string | undefined | null, minWidth: number = 200): string {
  return '100%'; // Toujours 100% de largeur
}

  // Méthode utilitaire pour les champs option
getOptionWidth(option: { valeur: string } | undefined, minWidth: number = 150): string {
  return '100%'; // Toujours 100% de largeur
}

  // Ajustement automatique lors de la saisie
  autoResizeField(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) {
      const content = target.textContent || '';
      const width = Math.max(200, content.length * 10 + 40);
      target.style.width = Math.min(width, 1000) + 'px';
    }
  }

  // Ajustement automatique pour les inputs
  onInputResize(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      const value = target.value;
      const width = Math.max(200, value.length * 8 + 40);
      target.style.width = Math.min(width, 800) + 'px';
    }
  }
  // Ajouter cette méthode dans la classe CheckListListComponent



// Méthode pour calculer la hauteur basée sur le contenu
getTextareaHeight(value: string | undefined | null, minHeight: number = 60): string {
  if (!value) return minHeight + 'px';
  
  const lineCount = (value.match(/\n/g) || []).length + 1;
  const calculatedHeight = Math.max(minHeight, lineCount * 24 + 32); // 24px par ligne + padding
  return Math.min(calculatedHeight, 300) + 'px'; // Hauteur max de 300px
}

// Ajouter ces méthodes dans la classe CheckListListComponent

// Générer des particules aléatoires
generateParticles(questionIndex: number): void {
  // Cette méthode peut être utilisée pour ajouter des effets visuels dynamiques
  console.log('Génération de particules pour la question', questionIndex);
}

// Animation lors de l'ajout d'une nouvelle question
animateNewQuestion(etape: EtapeFrontend, questionIndex: number): void {
  const newQuestion = etape.questions[questionIndex];
  // Ajouter une classe d'animation
  setTimeout(() => {
    // L'animation CSS s'occupe du reste
  }, 100);
}

// Méthode pour centrer le texte dynamiquement
centerText(element: HTMLElement): void {
  element.style.textAlign = 'center';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
}

// Ajouter ces méthodes dans la classe CheckListListComponent

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

// Méthode pour obtenir le type d'étape
getEtapeType(nomEtape: string): string {
  if (this.isAvantIntervention(nomEtape)) return 'Avant';
  if (this.isPendantIntervention(nomEtape)) return 'Pendant';
  if (this.isApresIntervention(nomEtape)) return 'Après';
  if (this.isControleFinal(nomEtape)) return 'Contrôle';
  return 'Phase';
}

// Méthodes pour identifier les types de questions
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

// Méthode pour l'expansion automatique des textarea
onTextareaResize(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  if (target) {
    // Réinitialiser la hauteur
    target.style.height = 'auto';
    
    // Ajuster la hauteur selon le contenu
    const newHeight = Math.max(target.scrollHeight, parseInt(target.getAttribute('min-height') || '80'));
    target.style.height = newHeight + 'px';
    
    // Ajouter une classe si le contenu est long
    if (target.value.length > 100) {
      target.classList.add('long-question');
    } else {
      target.classList.remove('long-question');
    }
  }
}
}