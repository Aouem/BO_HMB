import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormService } from '../../services/form-service';
import { CheckListService } from '../../services/check-list-service';
import { CheckListDto, EtapeDto, QuestionDto, FormResponseDto, QuestionResponseDto, FormSubmissionDto } from '../../models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checklist-formulaire',
  templateUrl: './checklist-formulaire.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./checklist-formulaire.css']
})
export class ChecklistFormulaireComponent implements OnInit {
  // Nouveaux états pour la sélection de checklist
  allChecklists: CheckListDto[] = [];
  selectedChecklist: CheckListDto | null = null;
  showChecklistSelection: boolean = true;

  // États existants
  checklistId: number = 0;
  currentUser: string = '';
  checklistNom: string = '';
  etapes: EtapeDto[] = [];
  form!: FormGroup;
  loading: boolean = false;

  // NAV question-par-question
  currentEtapeIndex: number = 0;
  currentQuestionIndex: number = 0;

  // état
  submitted: boolean = false;
  reponsesPartielles: QuestionResponseDto[] = [];
  etapesValidees: boolean[] = [];

  // DÉCISION FINALE
  decisionFinale: string = '';
  consequence: string = '';

  // affichage
  mode: 'etape' | 'question' = 'etape';
  autoAdvance: boolean = true;

  // Impression
  showPrintModal = false;
  patientNom = 'Nom du Patient';
  interventionType = 'Intervention Chirurgicale';
  currentDate = new Date();

  // Mapping des questions pour l'impression
  questionMapping: { [key: string]: number } = {};

  // Gestion des templates personnalisés
  customPrintTemplates: { [key: number]: string } = {};

  constructor(
    private formService: FormService,
    private checkListService: CheckListService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      libelle: ['', Validators.required],
      etapes: this.fb.array([])
    });

    this.loadCurrentUser();
    this.loadAllChecklists();
    this.loadCustomPrintTemplates();
  }

  // === NOUVELLES MÉTHODES POUR LA SÉLECTION DE CHECKLIST ===

  loadAllChecklists(): void {
    this.loading = true;
    this.checkListService.getAllCheckLists().subscribe({
      next: (checklists: CheckListDto[]) => {
        this.allChecklists = checklists;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement des checklists:', err);
        this.loading = false;
        alert('Erreur lors du chargement des checklists.');
      }
    });
  }

  selectChecklist(checklist: CheckListDto): void {
    this.selectedChecklist = checklist;
    this.checklistId = checklist.id;
    this.checklistNom = checklist.libelle;
    this.showChecklistSelection = false;
    this.loadChecklist();
    this.loadCustomPrintTemplates();
  }

  backToSelection(): void {
    this.showChecklistSelection = true;
    this.selectedChecklist = null;
    this.checklistId = 0;
    this.checklistNom = '';
    this.etapes = [];
    this.reponsesPartielles = [];
    this.etapesValidees = [];
    this.currentEtapeIndex = 0;
    this.currentQuestionIndex = 0;
    this.decisionFinale = '';
    this.consequence = '';
    this.submitted = false;
    this.mode = 'etape';
    this.questionMapping = {};
  }

  // Méthode utilitaire pour calculer le total des questions d'une checklist
  getTotalQuestions(checklist: CheckListDto): number {
    if (!checklist.etapes) return 0;
    return checklist.etapes.reduce((total, etape) => total + (etape.questions?.length || 0), 0);
  }

  // === GESTION DE LA DÉCISION FINALE ===

  onDecisionSelected(decision: string): void {
    this.decisionFinale = decision;
    
    // Réinitialiser la conséquence si on change de "Non" à "Oui"
    if (decision === 'Oui') {
      this.consequence = '';
    }
    
    this.savePartialProgress();
  }

  onConsequenceSelected(consequence: string): void {
    this.consequence = consequence;
    this.savePartialProgress();
  }

  // Classes CSS pour les boutons de décision
  getDecisionBtnClasses(value: string): any {
    return {
      'selected': this.decisionFinale === value,
      'btn-success': value === 'Oui' && this.decisionFinale === value,
      'btn-danger': value === 'Non' && this.decisionFinale === value,
      'btn-outline-primary': this.decisionFinale !== value
    };
  }

  // Classes CSS pour les boutons de conséquence
  getConsequenceBtnClasses(value: string): any {
    return {
      'selected': this.consequence === value,
      'btn-warning': this.consequence === value,
      'btn-outline-secondary': this.consequence !== value
    };
  }

  // Validation de la décision
  isDecisionComplete(): boolean {
    if (this.decisionFinale === 'Oui') {
      return true;
    } else if (this.decisionFinale === 'Non') {
      return !!this.consequence;
    }
    return false;
  }

  // Texte de statut
  getDecisionStatusText(): string {
    if (this.decisionFinale === 'Oui') {
      return '✅ Décision : GO - Intervention validée';
    } else if (this.decisionFinale === 'Non' && this.consequence) {
      return `❌ Décision : NO GO - ${this.consequence}`;
    } else if (this.decisionFinale === 'Non') {
      return '❌ Décision : NO GO - Sélectionnez une conséquence';
    }
    return '⏳ En attente de décision';
  }

  // Classe CSS pour le statut
  getDecisionStatusClass(): string {
    if (this.decisionFinale === 'Oui') {
      return 'status-success';
    } else if (this.decisionFinale === 'Non' && this.consequence) {
      return 'status-warning';
    } else if (this.decisionFinale === 'Non') {
      return 'status-danger';
    }
    return 'status-info';
  }

  // === MÉTHODES POUR L'IMPRESSION DYNAMIQUE ===

  getChecklistPrintTemplate(): string {
    if (!this.selectedChecklist) return 'default';
    
    // Vérifier d'abord si un template personnalisé est défini pour cette checklist
    if (this.customPrintTemplates[this.selectedChecklist.id]) {
      return this.customPrintTemplates[this.selectedChecklist.id];
    }
    
    // Détection automatique basée sur le nom
    const checklistName = this.selectedChecklist.libelle.toLowerCase();
    
    if (checklistName.includes('anesthés') || checklistName.includes('anesthes')) {
      return 'anesthesie';
    } else if (checklistName.includes('bloc') || checklistName.includes('opératoire') || checklistName.includes('operatoire')) {
      return 'bloc_operatoire';
    } else if (checklistName.includes('chirurgie') || checklistName.includes('chirurgical')) {
      return 'chirurgie';
    } else if (checklistName.includes('urgence') || checklistName.includes('emergency')) {
      return 'urgence';
    } else if (checklistName.includes('radiologie') || checklistName.includes('radiology')) {
      return 'radiologie';
    } else if (checklistName.includes('laboratoire') || checklistName.includes('laboratory')) {
      return 'laboratoire';
    } else {
      return 'default';
    }
  }

  // Méthode pour définir un template personnalisé pour une checklist
  setCustomPrintTemplate(checklistId: number, template: string): void {
    this.customPrintTemplates[checklistId] = template;
    // Sauvegarder dans le localStorage pour persister
    localStorage.setItem('customPrintTemplates', JSON.stringify(this.customPrintTemplates));
  }

  // Méthode pour charger les templates personnalisés
  loadCustomPrintTemplates(): void {
    const saved = localStorage.getItem('customPrintTemplates');
    if (saved) {
      try {
        this.customPrintTemplates = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur lors du chargement des templates personnalisés:', e);
        this.customPrintTemplates = {};
      }
    }
  }

  // Méthode pour obtenir le titre d'impression adapté
  getPrintTitle(): string {
    const template = this.getChecklistPrintTemplate();
    
    switch(template) {
      case 'anesthesie':
        return 'CHECK-LIST « SÉCURITÉ ANESTHÉSIQUE »';
      case 'bloc_operatoire':
        return 'CHECK-LIST « SÉCURITÉ DU PATIENT AU BLOC OPÉRATOIRE »';
      case 'chirurgie':
        return 'CHECK-LIST « SÉCURITÉ CHIRURGICALE »';
      case 'urgence':
        return 'CHECK-LIST « URGENCES MÉDICALES »';
      case 'radiologie':
        return 'CHECK-LIST « RADIOLOGIE ET IMAGERIE MÉDICALE »';
      case 'laboratoire':
        return 'CHECK-LIST « LABORATOIRE D\'ANALYSES MÉDICALES »';
      default:
        return `CHECK-LIST « ${this.checklistNom.toUpperCase()} »`;
    }
  }

  // Méthode pour obtenir la version
  getPrintVersion(): string {
    const template = this.getChecklistPrintTemplate();
    
    switch(template) {
      case 'anesthesie':
        return 'Version 2024';
      case 'bloc_operatoire':
        return 'Version 2018';
      case 'chirurgie':
        return 'Version 2023';
      case 'urgence':
        return 'Version 2024';
      case 'radiologie':
        return 'Version 2023';
      case 'laboratoire':
        return 'Version 2024';
      default:
        return 'Version 1.0';
    }
  }

  // Méthode pour obtenir la devise
  getPrintMotto(): string {
    const template = this.getChecklistPrintTemplate();
    
    switch(template) {
      case 'anesthesie':
        return '« Vérifier pour anesthésier en sécurité »';
      case 'bloc_operatoire':
        return '« Vérifier ensemble pour décider »';
      case 'chirurgie':
        return '« Sécuriser chaque geste »';
      case 'urgence':
        return '« Rapidité et sécurité »';
      case 'radiologie':
        return '« Précision et qualité »';
      case 'laboratoire':
        return '« Exactitude et fiabilité »';
      default:
        return `« ${this.checklistNom} »`;
    }
  }

  // Nouvelle méthode pour gérer la sélection de template d'impression
  selectPrintTemplate(template: string): void {
    if (this.selectedChecklist) {
      this.setCustomPrintTemplate(this.selectedChecklist.id, template);
      // Recharger le mapping des questions pour le nouveau template
      this.initializeQuestionMappingForPrint();
    }
  }

  // Méthode pour obtenir la liste des templates disponibles
  getAvailableTemplates(): {value: string, label: string}[] {
    return [
      { value: 'default', label: 'Template Générique' },
      { value: 'bloc_operatoire', label: 'Bloc Opératoire' },
      { value: 'anesthesie', label: 'Anesthésie' },
      { value: 'chirurgie', label: 'Chirurgie' },
      { value: 'urgence', label: 'Urgences' },
      { value: 'radiologie', label: 'Radiologie' },
      { value: 'laboratoire', label: 'Laboratoire' }
    ];
  }

  // === MÉTHODES EXISTANTES ===

  private loadCurrentUser(): void {
    this.currentUser = localStorage.getItem('currentUser') || 'utilisateur_anonyme';
  }

  loadChecklist() {
    if (!this.checklistId) return;
    
    this.loading = true;
    this.checkListService.getCheckList(this.checklistId).subscribe({
      next: (checklist: CheckListDto) => {
        console.log('🔍 DEBUG - Checklist COMPLÈTE reçue de l\'API:', checklist);
        
        this.checklistNom = checklist.libelle;
        
        // ✅ CORRECTION CRITIQUE : SUPPRIMER LE FILTRAGE - GARDER TOUTES LES ÉTAPES
        this.etapes = [...checklist.etapes];
        
        console.log('✅ Toutes les étapes conservées:', this.etapes.length, 'étapes');
        
        // DEBUG: Vérifier que l'étape décision est bien présente
        const decisionEtape = this.etapes.find(e => 
          e.nom.toLowerCase().includes('décision') || 
          e.nom.toLowerCase().includes('decision')
        );
        console.log(decisionEtape ? '✅ Étape décision trouvée' : '❌ Étape décision manquante');

        // Afficher tous les IDs de questions
        console.log('🔍 DEBUG - IDs des questions APRÈS correction:');
        this.etapes.forEach((etape, etapeIndex) => {
          console.log(`Étape ${etapeIndex + 1} (${etape.nom}):`);
          etape.questions.forEach((question, questionIndex) => {
            console.log(`  Q${questionIndex + 1}: ID=${question.id}, Texte="${question.texte.substring(0, 50)}..."`);
          });
        });

        // Initialiser le mapping des questions POUR L'IMPRESSION
        this.initializeQuestionMappingForPrint();

        // Initialisation sécurisée des étapes validées
        this.etapesValidees = new Array(this.etapes.length).fill(false);

        this.loading = false;

        // Vérifier si les étapes sont bien chargées avant de manipuler les indices
        if (this.etapes.length > 0) {
          if (this.currentEtapeIndex === undefined || this.currentEtapeIndex >= this.etapes.length) {
            this.currentEtapeIndex = 0;
          }
          const currentEtape = this.etapes[this.currentEtapeIndex];
          
          if (currentEtape && currentEtape.questions.length > 0) {
            this.currentQuestionIndex = 0;
          }
        }

        // Charger les étapes validées après avoir initialisé les indices
        this.loadEtapesValidees();
        this.loadPartialProgress();
      },
      error: (_err: any) => {
        this.loading = false;
        alert('Erreur lors du chargement de la checklist.');
      }
    });
  }

  // === MAPPING AMÉLIORÉ POUR L'IMPRESSION ===
  private initializeQuestionMappingForPrint(): void {
    this.questionMapping = {};
    
    const template = this.getChecklistPrintTemplate();
    
    if (template === 'anesthesie') {
      // Mapping pour la checklist anesthésie
      const anesthesieQuestions = [
        { key: 'consultation_anesthesie', keywords: ["consultation", "anesthésie", "conforme"] },
        { key: 'bilan_biologique', keywords: ["bilan", "biologique", "jour"] },
        { key: 'jeune_pre_operatoire', keywords: ["jeûne", "pré-opératoire", "respecté"] },
        { key: 'allergies_documentees', keywords: ["allergies", "connues", "documentées"] },
        { key: 'materiel_intubation', keywords: ["matériel", "intubation", "vérifié"] },
        { key: 'medicaments_anesthesie', keywords: ["médicaments", "anesthésie", "préparés"] },
        { key: 'voies_veineuses', keywords: ["voies", "veineuses", "périphériques"] },
        { key: 'monitorage_standard', keywords: ["monitorage", "standard", "connecté"] }
      ];
      
      anesthesieQuestions.forEach(question => {
        const realQuestion = this.findQuestionByKeywords(question.keywords);
        if (realQuestion) {
          this.questionMapping[question.key] = realQuestion.id;
        }
      });
      
    } else if (template === 'bloc_operatoire') {
      // Mapping existant pour le bloc opératoire
      const blocQuestions = [
        { key: 'identite_patient', keywords: ["identité", "patient", "correcte"] },
        { key: 'autorisation_operer', keywords: ["autorisation", "opérer", "signée", "parents"] },
        { key: 'intervention_site', keywords: ["intervention", "site", "opératoire", "confirmés"] },
        { key: 'mode_installation', keywords: ["mode", "installation", "équipe", "salle"] },
        { key: 'preparation_cutanee', keywords: ["préparation", "cutanée", "documentée"] },
        { key: 'equipement_materiel', keywords: ["équipement", "matériel", "vérifiés", "poids"] },
        { key: 'verification_ultime', keywords: ["vérification", "ultime", "équipe", "chirurgiens"] },
        { key: 'partage_informations', keywords: ["partage", "informations", "essentielles", "oralement"] },
        { key: 'confirmation_orale', keywords: ["confirmation", "orale", "personnel", "équipe"] },
        { key: 'prescriptions_surveillance', keywords: ["prescriptions", "surveillance", "post-opératoires"] }
      ];
      
      blocQuestions.forEach(question => {
        const realQuestion = this.findQuestionByKeywords(question.keywords);
        if (realQuestion) {
          this.questionMapping[question.key] = realQuestion.id;
        }
      });
    } else if (template === 'urgence') {
      // Mapping pour les urgences
      const urgenceQuestions = [
        { key: 'hemodynamique_stable', keywords: ["hémodynamique", "stable", "tension"] },
        { key: 'voies_aeriennes_libres', keywords: ["voies", "aériennes", "libres"] },
        { key: 'glasgow_evalue', keywords: ["glasgow", "évalué", "score"] }
      ];
      
      urgenceQuestions.forEach(question => {
        const realQuestion = this.findQuestionByKeywords(question.keywords);
        if (realQuestion) {
          this.questionMapping[question.key] = realQuestion.id;
        }
      });
    } else if (template === 'radiologie') {
      // Mapping pour la radiologie
      const radiologieQuestions = [
        { key: 'consentement_radio', keywords: ["consentement", "signé", "éclairé"] },
        { key: 'allergie_contraste', keywords: ["allergie", "contraste", "produit"] },
        { key: 'fonction_renale', keywords: ["fonction", "rénale", "créatinine"] }
      ];
      
      radiologieQuestions.forEach(question => {
        const realQuestion = this.findQuestionByKeywords(question.keywords);
        if (realQuestion) {
          this.questionMapping[question.key] = realQuestion.id;
        }
      });
    } else if (template === 'laboratoire') {
      // Mapping pour le laboratoire
      const laboratoireQuestions = [
        { key: 'echantillon_identifie', keywords: ["échantillon", "identifié", "étiqueté"] },
        { key: 'transport_respecte', keywords: ["transport", "conditions", "respectées"] },
        { key: 'controle_qualite', keywords: ["contrôle", "qualité", "instruments"] }
      ];
      
      laboratoireQuestions.forEach(question => {
        const realQuestion = this.findQuestionByKeywords(question.keywords);
        if (realQuestion) {
          this.questionMapping[question.key] = realQuestion.id;
        }
      });
    }
    // Pour le template par défaut, pas besoin de mapping spécifique
  }

  // Recherche améliorée par mots-clés
  private findQuestionByKeywords(keywords: string[]): QuestionDto | null {
    let bestMatch: { question: QuestionDto, score: number } | null = null;

    for (const etape of this.etapes) {
      for (const question of etape.questions) {
        const questionText = question.texte.toLowerCase();
        let score = 0;

        // Calculer le score de correspondance
        keywords.forEach(keyword => {
          if (questionText.includes(keyword.toLowerCase())) {
            score++;
          }
        });

        // Si on a une correspondance parfaite, retourner immédiatement
        if (score === keywords.length) {
          return question;
        }

        // Garder la meilleure correspondance
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { question, score };
        }
      }
    }

    return bestMatch ? bestMatch.question : null;
  }

  // === GETTERS ===
  get currentEtape(): EtapeDto | null {
    return this.etapes[this.currentEtapeIndex] || null;
  }
  get currentQuestion(): QuestionDto | null {
    const etape = this.currentEtape;
    return etape?.questions?.[this.currentQuestionIndex] ?? null;
  }
  get isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }
  get isLastQuestionInEtape(): boolean {
    const etape = this.currentEtape;
    if (!etape) return true;
    return this.currentQuestionIndex === etape.questions.length - 1;
  }

  get totalQuestions(): number {
    return this.etapes.reduce((total, etape) => total + etape.questions.length, 0);
  }
  get answeredQuestions(): number {
    return this.reponsesPartielles.length;
  }
  get etapesCompletees(): number {
    return this.etapesValidees.filter(v => v).length;
  }

  // === NOUVELLES MÉTHODES POUR LA VALIDATION SÉQUENTIELLE ===
  
  // Vérifier si une étape est accessible
  isEtapeAccessible(etapeIndex: number): boolean {
    if (etapeIndex === 0) return true; // Première étape toujours accessible
    
    // Vérifier que toutes les étapes précédentes sont validées
    for (let i = 0; i < etapeIndex; i++) {
      if (!this.etapesValidees[i]) {
        return false;
      }
    }
    return true;
  }

  // Vérifier si le bouton "Commencer" doit être désactivé
  isStartButtonDisabled(etapeIndex: number): boolean {
    return !this.isEtapeAccessible(etapeIndex);
  }

  // Obtenir le texte du tooltip pour les étapes non accessibles
  getEtapeTooltip(etapeIndex: number): string {
    if (this.isEtapeAccessible(etapeIndex)) {
      return '';
    }
    
    const etapesManquantes = [];
    for (let i = 0; i < etapeIndex; i++) {
      if (!this.etapesValidees[i]) {
        etapesManquantes.push(i + 1);
      }
    }
    
    return `Validez d'abord les étapes : ${etapesManquantes.join(', ')}`;
  }

  // === PROGRESSION ===
  private isNonEmpty(v?: string | null): boolean {
    return !!v && v.trim() !== '';
  }

  getGlobalProgress(): number {
    const total = this.totalQuestions;
    if (total === 0) return 0;
    const answered = this.etapes.reduce((acc, _, idx) => acc + this.getEtapeAnsweredQuestions(idx), 0);
    return (answered / total) * 100;
  }

  getEtapeProgress(etapeIndex: number): number {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions?.length) return 0;
    const answered = etape.questions.filter(q => this.isNonEmpty(this.getQuestionResponse(q.id))).length;
    return (answered / etape.questions.length) * 100;
  }

  getEtapeAnsweredQuestions(etapeIndex: number): number {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions) return 0;
    return etape.questions.filter(q => this.isNonEmpty(this.getQuestionResponse(q.id))).length;
  }

  // Étape complète = toutes les questions avec réponse non vide
  isEtapeComplete(etapeIndex: number): boolean {
    const etape = this.etapes[etapeIndex];
    if (!etape?.questions?.length) return false;
    return etape.questions.every(q => this.isNonEmpty(this.getQuestionResponse(q.id)));
  }

  // === VALIDATION ÉTAPES ===
  validerEtape() {
    if (this.isEtapeComplete(this.currentEtapeIndex)) {
      this.etapesValidees[this.currentEtapeIndex] = true;
      this.savePartialProgress();

      if (this.currentEtapeIndex === this.etapes.length - 1) {
        this.mode = 'etape';
      } else {
        this.currentEtapeIndex++;
        this.currentQuestionIndex = 0;
        this.savePartialProgress();
      }
    }
  }

  reouvrirEtape(etapeIndex: number) {
    this.etapesValidees[etapeIndex] = false;
    this.savePartialProgress();
  }

  // === NAVIGATION ===
  commencerEtape(etapeIndex: number) {
    if (!this.isEtapeAccessible(etapeIndex)) {
      return; // Ne pas permettre l'accès si l'étape n'est pas accessible
    }
    
    this.currentEtapeIndex = etapeIndex;
    this.mode = 'question';
    this.goToFirstUnansweredQuestion();
    this.savePartialProgress();
  }

  retourAuTableauDeBord() {
    this.mode = 'etape';
    this.savePartialProgress();
  }

  nextQuestion() {
    if (!this.isLastQuestionInEtape) {
      this.currentQuestionIndex++;
      this.savePartialProgress();
    }
  }

  prevQuestion() {
    if (!this.isFirstQuestion) {
      this.currentQuestionIndex--;
      this.savePartialProgress();
    }
  }

  canGoNext(): boolean {
    const q = this.currentQuestion;
    if (!q) return false;
    return this.isNonEmpty(this.getQuestionResponse(q.id));
  }

  private goToFirstUnansweredQuestion(): void {
    const etape = this.currentEtape;
    if (!etape?.questions?.length) {
      this.currentQuestionIndex = 0;
      return;
    }
    const idx = etape.questions.findIndex(q => !this.isNonEmpty(this.getQuestionResponse(q.id)));
    this.currentQuestionIndex = idx >= 0 ? idx : 0;
  }

  // === RÉPONSES - MÉTHODE CORRIGÉE ===
  getQuestionResponse(questionId: number): string | null {
    const response = this.reponsesPartielles.find(r => r.questionId === questionId);
    return response?.reponse ?? null;
  }

  isQuestionResponse(questionId: number, value: string): boolean {
    return this.getQuestionResponse(questionId) === value;
  }

  onAnswerSelected(questionId: number, value: string) {
    // DEBUG: Vérifier la correspondance des IDs
    console.log('🔍 DEBUG onAnswerSelected:', {
      questionIdParam: questionId,
      currentQuestionId: this.currentQuestion?.id,
      sameIds: questionId === this.currentQuestion?.id,
      currentQuestionText: this.currentQuestion?.texte
    });

    const response: QuestionResponseDto = { 
      questionId: questionId,  // ← CORRECTION: Utiliser questionId directement
      reponse: value 
    };
    
    const existingIndex = this.reponsesPartielles.findIndex(r => r.questionId === questionId);

    if (existingIndex >= 0) {
      this.reponsesPartielles[existingIndex] = response;
    } else {
      this.reponsesPartielles.push(response);
    }

    console.log('📊 Réponses partielles mises à jour:', this.reponsesPartielles);
    this.savePartialProgress();

    // Avancer automatiquement
    if (this.mode === 'question' && this.autoAdvance && this.canGoNext()) {
      if (!this.isLastQuestionInEtape) this.nextQuestion();
    }
  }

  // === SUBMIT ===
  // Dans checklist-formulaire.ts - REMPLACER submitFinalForm()
submitFinalForm() {
  // ✅ DEBUG COMPLET avant soumission
  console.log('🔍📋 DEBUG AVANT SOUMISSION - État complet:');
  console.log('- Checklist ID:', this.checklistId);
  console.log('- Réponses partielles:', this.reponsesPartielles);
  console.log('- Nombre de réponses:', this.reponsesPartielles.length);
  console.log('- Décision finale:', this.decisionFinale);
  console.log('- Conséquence:', this.consequence);
  console.log('- Utilisateur:', this.currentUser);

  // ✅ VALIDATION RENFORCÉE
  if (this.reponsesPartielles.length === 0) {
    console.error('❌📋 ERREUR: Aucune réponse à soumettre!');
    alert('Aucune réponse à soumettre !');
    return;
  }

  // Vérifier les IDs de questions
  const validQuestionIds = new Set<number>();
  this.etapes.forEach(etape => {
    etape.questions.forEach(question => {
      validQuestionIds.add(question.id);
    });
  });

  const invalidResponses = this.reponsesPartielles.filter(reponse => 
    !validQuestionIds.has(reponse.questionId)
  );

  if (invalidResponses.length > 0) {
    console.error('❌📋 Réponses avec IDs invalides:', invalidResponses);
    console.log('✅ IDs valides:', Array.from(validQuestionIds));
    alert(`Erreur: ${invalidResponses.length} réponse(s) ont des IDs de question invalides.`);
    return;
  }

  // ✅ CORRECTION CRITIQUE : Gestion robuste de la décision
  let decisionFinaleASoumettre = this.decisionFinale;
  let consequenceASoumettre = this.consequence;

  // Si pas d'étape décision mais checklist complétée, définir automatiquement
  if (!this.hasDecisionEtape() && this.toutesEtapesValidees()) {
    console.log('⚠️📋 Checklist sans étape décision - attribution automatique GO');
    decisionFinaleASoumettre = 'Oui';
    consequenceASoumettre = '';
  }

  // Validation finale de la décision
  if (!decisionFinaleASoumettre) {
    console.error('❌📋 ERREUR CRITIQUE: decisionFinale est VIDE!');
    alert('Veuillez sélectionner une décision finale avant de soumettre.');
    return;
  }

  // ✅ CRÉATION EXPLICITE du FormData
  const formData: FormResponseDto = {
    checkListId: this.checklistId,
    reponses: [...this.reponsesPartielles], // Copie explicite
    submittedBy: this.currentUser,
    submittedAt: new Date().toISOString(),
    decisionFinale: decisionFinaleASoumettre, // ✅ GARANTI d'être défini
    consequence: consequenceASoumettre        // ✅ GARANTI d'être défini
  };

  console.log('📤📋 DEBUG - FormData créé pour envoi:', {
    checkListId: formData.checkListId,
    nbReponses: formData.reponses.length,
    decisionFinale: formData.decisionFinale,
    consequence: formData.consequence,
    formDataComplet: formData
  });

  this.loading = true;
  
  this.formService.submitForm(formData).subscribe({
    next: (response: FormSubmissionDto) => {
      console.log('✅📋 Soumission RÉUSSIE:', {
        submissionId: response.id,
        nbReponsesSauvegardees: response.reponses?.length || 0,
        decisionFinaleSauvegardee: response.decisionFinale,
        consequenceSauvegardee: response.consequence,
        reponseComplete: response
      });
      
      this.submitted = true;
      this.loading = false;
      
      // Nettoyer le cache local
      localStorage.removeItem(`checklist_${this.checklistId}_progress`);
      
      alert(`✅ Formulaire soumis avec succès !\nID: ${response.id}\nRéponses: ${response.reponses?.length || 0}\nDécision: ${response.decisionFinale || this.decisionFinale}`);
    },
    error: (err: any) => {
      console.error('❌📋 Erreur de soumission détaillée:', {
        error: err,
        message: err.message,
        status: err.status
      });
      this.loading = false;
      alert(`❌ Erreur lors de la soumission: ${err.message || 'Vérifiez la console'}`);
    }
  });
}

// ✅ AJOUTER cette méthode pour tester manuellement
testSubmissionManuelle(): void {
  console.log('🧪 TEST MANUEL DE SOUMISSION');
  
  // Données de test garanties
  const testData: FormResponseDto = {
    checkListId: this.checklistId,
    reponses: [
      { questionId: 198, reponse: 'Oui' },
      { questionId: 199, reponse: 'Oui' }
    ],
    submittedBy: 'test-manuel',
    submittedAt: new Date().toISOString(),
    decisionFinale: 'Oui',
    consequence: 'Test réussi'
  };

  console.log('🧪 Données de test:', testData);

  this.formService.submitForm(testData).subscribe({
    next: (response) => {
      console.log('🧪✅ Soumission test réussie:', response);
      alert('Test réussi! Voir console.');
    },
    error: (error) => {
      console.error('🧪❌ Erreur soumission test:', error);
      alert('Test échoué! Voir console.');
    }
  });
}

// Ajouter cette méthode utilitaire
hasDecisionEtape(): boolean {
  return this.etapes.some(etape => 
    etape.nom.toLowerCase().includes('décision') || 
    etape.nom.toLowerCase().includes('decision')
  );
}

  debugChecklistQuestions(): void {
    console.log('🐛 DEBUG - Questions de la checklist:');
    this.etapes.forEach((etape, etapeIndex) => {
      console.log(`Étape ${etapeIndex + 1} (${etape.nom}):`);
      etape.questions.forEach((question, questionIndex) => {
        console.log(`  Q${questionIndex + 1}: ID=${question.id}, Texte="${question.texte}"`);
      });
    });
    
    console.log('📝 Réponses partielles actuelles:');
    this.reponsesPartielles.forEach(reponse => {
      console.log(`  QuestionId: ${reponse.questionId}, Réponse: ${reponse.reponse}`);
    });
  }

  // === STORAGE ===
  savePartialProgress() {
    const partialData = {
      checkListId: this.checklistId,
      reponses: this.reponsesPartielles,
      currentEtape: this.currentEtapeIndex,
      currentQuestion: this.currentQuestionIndex,
      etapesValidees: this.etapesValidees,
      decisionFinale: this.decisionFinale,
      consequence: this.consequence,
      mode: this.mode
    };
    localStorage.setItem(`checklist_${this.checklistId}_progress`, JSON.stringify(partialData));
  }

  loadPartialProgress() {
    const saved = localStorage.getItem(`checklist_${this.checklistId}_progress`);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        this.reponsesPartielles = progress.reponses || [];
        this.currentEtapeIndex = Number.isInteger(progress.currentEtape) ? progress.currentEtape : 0;
        this.currentQuestionIndex = Number.isInteger(progress.currentQuestion) ? progress.currentQuestion : 0;
        this.etapesValidees = progress.etapesValidees || new Array(this.etapes.length).fill(false);
        this.decisionFinale = progress.decisionFinale || '';
        this.consequence = progress.consequence || '';
        this.mode = progress.mode || 'etape';
      } catch (_e) {
        // ignore
      }
    }
  }

  loadEtapesValidees() {
    this.etapes.forEach((_, index) => {
      this.etapesValidees[index] = this.isEtapeComplete(index);
    });
  }

  // === RESET ===
  resetForm() {
    this.currentEtapeIndex = 0;
    this.currentQuestionIndex = 0;
    this.reponsesPartielles = [];
    this.etapesValidees = new Array(this.etapes.length).fill(false);
    this.decisionFinale = '';
    this.consequence = '';
    this.mode = 'etape';
    this.submitted = false;
    localStorage.removeItem(`checklist_${this.checklistId}_progress`);
  }

  // === UTILITAIRES ===
  getBooleanOptions(type: string): string[] {
    return type === 'BooleanNA' ? ['Oui', 'Non', 'N/A'] : ['Oui', 'Non'];
  }

  getEtapeColorClass(etapeIndex: number): string {
    const colors = ['etape-color-0', 'etape-color-1', 'etape-color-2', 'etape-color-3'];
    return colors[etapeIndex % colors.length] || 'etape-color-0';
  }

  isLastEtape(): boolean {
    return this.currentEtapeIndex === this.etapes.length - 1;
  }

  toutesEtapesValidees(): boolean {
    return this.etapesValidees.every(v => v);
  }

  previewSoumission(): void {
    alert(`Prévisualisation: ${this.reponsesPartielles.length} réponses\nDécision finale: ${this.decisionFinale || 'Non définie'}`);
  }

  getChoiceBtnClasses(questionId: number, value: string): string {
    const selected = this.isQuestionResponse(questionId, value);
    const map = {
      'Oui': { on: 'btn-success', off: 'btn-outline-success' },
      'Non': { on: 'btn-danger',  off: 'btn-outline-danger' },
      'N/A': { on: 'btn-secondary', off: 'btn-outline-secondary' }
    } as const;

    const styles = map[value as keyof typeof map] || { on: 'btn-primary', off: 'btn-outline-primary' };
    return selected ? styles.on : styles.off;
  }

  // === MÉTHODES POUR L'IMPRESSION - CORRIGÉES ===

  // Vérifier si une question spécifique est cochée POUR L'IMPRESSION
  isQuestionCheckedForPrint(questionKey: string, value: string): boolean {
    const questionId = this.questionMapping[questionKey];
    if (!questionId) {
      return false;
    }
    
    const response = this.getQuestionResponse(questionId);
    
    // Gestion spéciale pour N/A
    if (response === 'N/A' && value === 'N/A') {
      return true;
    }
    if (response === 'N/A' && (value === 'Oui' || value === 'Non')) {
      return false;
    }
    
    return response === value;
  }

  // === IMPRESSION ===
  openPrintModal(): void {
    this.showPrintModal = true;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
  }

  printChecklist(): void {
    this.openPrintModal();
  }

  printChecklistNow(): void {
    const printContent = document.getElementById('checklist-print-content');
    const windowPrint = window.open('', '_blank', 'width=1024,height=724');
    
    if (windowPrint && printContent) {
      windowPrint.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.getPrintTitle()}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
              font-size: 14px;
              color: #000;
            }
            .print-header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .print-header h1 {
              font-size: 18px;
              margin: 0 0 5px 0;
              color: #000;
            }
            .print-header h2 {
              font-size: 14px;
              margin: 0 0 10px 0;
              color: #666;
            }
            .print-motto {
              font-style: italic;
              margin: 5px 0;
            }
            .patient-info-print {
              margin-top: 10px;
              font-size: 12px;
            }
            hr {
              border: 1px solid #000;
              margin: 20px 0;
            }
            .print-section {
              margin-bottom: 25px;
            }
            .print-section h2 {
              font-size: 16px;
              margin-bottom: 10px;
              color: #000;
              background: #f0f0f0;
              padding: 5px 10px;
            }
            .print-subtitle {
              font-weight: bold;
              margin-bottom: 15px;
            }
            .print-item {
              margin: 12px 0;
              page-break-inside: avoid;
            }
            .print-item p {
              margin: 5px 0;
            }
            .indented {
              margin-left: 20px;
              font-size: 13px;
            }
            .indented-small {
              margin-left: 30px;
              font-size: 12px;
              font-style: italic;
            }
            .checkbox-print {
              margin: 8px 0;
              display: flex;
              gap: 20px;
            }
            .checkbox-print span {
              font-size: 13px;
            }
            .checkbox-print span.checked::before {
              content: "☑";
              margin-right: 5px;
              font-weight: bold;
            }
            .checkbox-print span:not(.checked)::before {
              content: "☐";
              margin-right: 5px;
            }
            .text-response-print {
              margin-top: 5px;
              padding: 5px;
              border: 1px solid #ccc;
              background: #f9f9f9;
            }
            .decision-section {
              background: #f8f8f8;
              padding: 15px;
              border: 1px solid #000;
            }
            .decision-finale-print {
              margin: 15px 0;
            }
            .decision-option {
              margin: 8px 0;
            }
            .decision-option span.checked::before {
              content: "☑";
              margin-right: 5px;
              font-weight: bold;
            }
            .decision-option span:not(.checked)::before {
              content: "☐";
              margin-right: 5px;
            }
            .consequences-print {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
            }
            .signatures-section {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-title {
              text-align: center;
              margin-bottom: 5px;
            }
            .signature-subtitle {
              text-align: center;
              font-size: 12px;
              margin-bottom: 20px;
            }
            .signatures-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .signature-box {
              width: 30%;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
              height: 20px;
            }
            @media print {
              body { 
                margin: 10mm; 
                font-size: 12px;
              }
              .print-header h1 { font-size: 16px; }
              .print-section h2 { font-size: 14px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      
      setTimeout(() => {
        windowPrint.print();
      }, 500);
    }
  }

  // === HISTORIQUE ===
  viewSubmissionHistory(): void {
    if (!this.checklistId) {
      alert('Veuillez d\'abord sélectionner une checklist');
      return;
    }

    this.formService.getFormSubmissions(this.checklistId).subscribe({
      next: (submissions: FormSubmissionDto[]) => {
        if (submissions.length === 0) {
          alert(`Aucune soumission trouvée pour "${this.checklistNom}" (ID: ${this.checklistId})`);
          return;
        }

        const sortedSubmissions = submissions.sort((a, b) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        const historyMessage = sortedSubmissions.map((s, index) => 
          `#${index + 1} - ID: ${s.id} - ${new Date(s.submittedAt).toLocaleString('fr-FR')} - Par: ${s.submittedBy} - Réponses: ${s.reponses?.length || 0}`
        ).join('\n');

        alert(`📊 Historique pour "${this.checklistNom}" (${submissions.length} soumissions):\n\n${historyMessage}`);
      },
      error: (err) => {
        console.error('❌ Erreur complète:', err);
        alert('Erreur lors du chargement de l\'historique. Vérifiez la console.');
      }
    });
  }
  // === NOUVELLE MÉTHODE POUR IDENTIFIER LES QUESTIONS DE DÉCISION ===


// === NOUVELLES MÉTHODES POUR GÉRER LES ÉTAPES NORMALES ===

// Vérifie si toutes les étapes NORMALES (sans la décision) sont validées
toutesEtapesNormalesValidees(): boolean {
  const etapesNormales = this.getEtapesNormales();
  return etapesNormales.every((_, index) => this.etapesValidees[index]);
}

// Obtient le nombre d'étapes normales restantes à valider
getEtapesNormalesRestantes(): number {
  const etapesNormales = this.getEtapesNormales();
  const etapesNormalesValidees = etapesNormales.filter((_, index) => this.etapesValidees[index]);
  return etapesNormales.length - etapesNormalesValidees.length;
}

// Obtient le total des étapes normales
getTotalEtapesNormales(): number {
  return this.getEtapesNormales().length;
}

// Obtient les étapes normales (exclut l'étape décision)
private getEtapesNormales(): EtapeDto[] {
  return this.etapes.filter(etape => 
    !(etape.nom.toLowerCase().includes('décision') || 
      etape.nom.toLowerCase().includes('decision'))
  );
}

// Méthode pour identifier les questions de décision
isDecisionQuestion(question: QuestionDto): boolean {
  if (!question) return false;
  
  const decisionKeywords = [
    'décision', 'decision', 'go', 'no go', 'incision', 'ok pour incision',
    'intervention validée', 'conséquence', 'retard', 'annulation'
  ];
  
  const questionText = question.texte.toLowerCase();
  
  return decisionKeywords.some(keyword => 
    questionText.includes(keyword.toLowerCase())
  );
}
}