import { Component, signal, ViewChild, ElementRef, inject, effect, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ClusteringService, TrendingCluster } from '../../core/services/clustering.service';

interface RecentQuestion {
  id: string;
  text: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements AfterViewInit, OnInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('textInput') private textInput!: ElementRef<HTMLTextAreaElement>;

  chatService = inject(ChatService);
  authService = inject(AuthService);
  private clusteringService = inject(ClusteringService);
  private router = inject(Router);

  textMessage = signal('');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isYouTubeLink = signal(false);

  recentQuestions = signal<RecentQuestion[]>([]);
  isLoadingRecent = signal(false);

  // Reconnaissance vocale
  isRecording = signal(false);
  isSelectingLanguage = signal(false);
  selectedLanguage = signal<'fr-FR' | 'en-US'>('fr-FR');

  // Feedback copie
  copiedMessageIndex = signal<number | null>(null);
  private recognition: any = null;
  private silenceTimeout: any = null;
  private finalTranscript = '';

  private isViewReady = false;

  get messages() {
    return this.chatService.messages;
  }

  get isLoading() {
    return this.chatService.isLoading;
  }

  constructor() {
    effect(() => {
      const messages = this.chatService.messages();
      const streamingContent = this.chatService.currentStreamingMessage();
      if (this.isViewReady && (messages.length > 0 || streamingContent)) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  ngOnInit(): void {
    this.loadTrendingQuestions();
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
  }

  //  FONCTION POUR DÉTECTER LE PAYS 
  private getBrowserInfo() {
    // Récupère la config du navigateur (ex: "fr-FR", "en-US", "fr-BE")
    const browserLocale = navigator.language || 'fr-FR';
    
    const parts = browserLocale.split('-'); 
    return {
      lang: parts[0] || 'fr',        
      country: parts[1] || 'FR'      
    };
  }

  private loadTrendingQuestions(): void {
    this.isLoadingRecent.set(true);
    this.clusteringService.getTrendingClusters(7, 3).subscribe({
      next: (response) => {
        if (response.success && response.clusters) {
          const questions = response.clusters.map(cluster => ({
            id: cluster.id,
            text: cluster.representativeText
          }));
          this.recentQuestions.set(questions);
        }
        this.isLoadingRecent.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des questions tendances:', error);
        this.isLoadingRecent.set(false);
      }
    });
  }

  toggleTheme(): void {
    console.log('Toggle theme');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  selectRecentQuestion(questionText: string): void {
    this.textMessage.set(questionText);
    this.sendMessage();
  }

  onInputChange(): void {
    const text = this.textMessage();
    this.isYouTubeLink.set(this.containsYouTubeUrl(text));
  }

  // Auto-resize du textarea
  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Reset la hauteur du textarea après envoi
  private resetTextareaHeight(): void {
    if (this.textInput) {
      this.textInput.nativeElement.style.height = 'auto';
    }
  }

  // Vérifie si le texte CONTIENT un lien YouTube (n'importe où)
  private containsYouTubeUrl(text: string): boolean {
    const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;
    return youtubeRegex.test(text.trim());
  }

  // Extrait l'URL YouTube et la question utilisateur du texte
  private extractYouTubeAndQuestion(text: string): { url: string; question: string } | null {
    const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;
    const match = text.match(youtubeRegex);

    if (!match) return null;

    const url = match[0];
    // La question est tout le texte sauf l'URL YouTube
    const question = text.replace(url, '').trim();

    return { url, question };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.selectedFile.set(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        this.previewUrl.set(URL.createObjectURL(file));
      } else {
        this.previewUrl.set(null);
      }
    }
  }

  clearSelectedFile(): void {
    const currentPreview = this.previewUrl();
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  async sendMessage(): Promise<void> {
    if (this.isLoading()) return;

    const file = this.selectedFile();
    const text = this.textMessage().trim();
    const { country, lang } = this.getBrowserInfo();

    // Cas 1 : Fichier (image/vidéo) avec question optionnelle
    if (file) {
      await this.chatService.sendFileMessage(file, text, country, lang);
      this.clearSelectedFile();
      this.textMessage.set('');
      this.resetTextareaHeight();
      return;
    }

    // Cas 2 : Texte seul ou lien YouTube
    if (!text) return;

    this.textMessage.set('');
    this.isYouTubeLink.set(false);
    this.resetTextareaHeight();

    // Vérifier si le texte contient un lien YouTube (n'importe où dans le texte)
    const youtubeData = this.extractYouTubeAndQuestion(text);

    if (youtubeData) {
      // Envoyer le lien YouTube avec la question de l'utilisateur
      await this.chatService.sendYouTubeMessage(youtubeData.url, youtubeData.question, country, lang);
    } else {
      // Texte simple sans lien YouTube
      await this.chatService.sendTextMessage(text, country, lang);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  isVideo(file: File): boolean {
    return file.type.startsWith('video/');
  }

  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  isDocument(file: File): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain'
    ];
    return documentTypes.includes(file.type);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  newChat(): void {
    this.chatService.resetSession();
    this.clearSelectedFile();
    this.textMessage.set('');
    this.isYouTubeLink.set(false);
  }

  copyToClipboard(text: string, index: number): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedMessageIndex.set(index);
      setTimeout(() => {
        this.copiedMessageIndex.set(null);
      }, 1000);
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // Reconnaissance vocale
  toggleVoiceRecording(): void {
    if (this.isRecording()) {
      this.stopRecording();
    } else if (this.isSelectingLanguage()) {
      this.cancelLanguageSelection();
    } else {
      this.isSelectingLanguage.set(true);
    }
  }

  selectLanguageAndRecord(lang: 'fr-FR' | 'en-US'): void {
    this.selectedLanguage.set(lang);
    this.isSelectingLanguage.set(false);
    this.startRecording();
  }

  cancelLanguageSelection(): void {
    this.isSelectingLanguage.set(false);
  }

  private startRecording(): void {
    // Verification du support de l'API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('La reconnaissance vocale n\'est pas supportee par votre navigateur. Utilisez Chrome ou Edge.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.selectedLanguage();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.finalTranscript = '';

    this.recognition.onstart = () => {
      this.isRecording.set(true);
      this.resetSilenceTimeout();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Reinitialise le timeout a chaque nouvelle parole detectee
      this.resetSilenceTimeout();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      this.clearSilenceTimeout();
      this.isRecording.set(false);
      if (event.error === 'not-allowed') {
        alert('Acces au microphone refuse. Veuillez autoriser l\'acces dans les parametres de votre navigateur.');
      }
    };

    this.recognition.onend = () => {
      this.clearSilenceTimeout();
      this.isRecording.set(false);
      // Envoie le message si on a du texte
      if (this.finalTranscript.trim()) {
        this.textMessage.set(this.finalTranscript.trim());
        this.sendMessage();
      }
    };

    this.recognition.start();
  }

  private stopRecording(): void {
    this.clearSilenceTimeout();
    if (this.recognition) {
      this.recognition.stop();
      this.isRecording.set(false);
    }
  }

  private resetSilenceTimeout(): void {
    this.clearSilenceTimeout();
    // Arrete l'enregistrement apres 2 secondes de silence
    this.silenceTimeout = setTimeout(() => {
      if (this.recognition && this.isRecording()) {
        this.recognition.stop();
      }
    }, 2000);
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
}
