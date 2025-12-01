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

  private isViewReady = false;

  get messages() {
    return this.chatService.messages;
  }

  get isLoading() {
    return this.chatService.isLoading;
  }

  constructor() {
    // Scroll automatique a chaque changement de messages ou de streaming
    effect(() => {
      const messages = this.chatService.messages();
      const streamingContent = this.chatService.currentStreamingMessage();

      // Declenche le scroll a chaque mise a jour
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
    // TODO: Implementer le changement de theme dark/light
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
    this.isYouTubeLink.set(this.isYouTubeUrl(text));
  }

  private isYouTubeUrl(text: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;
    return youtubeRegex.test(text.trim());
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
    if (file) {
      await this.chatService.sendFileMessage(file);
      this.clearSelectedFile();
      return;
    }

    const text = this.textMessage().trim();
    if (!text) return;

    this.textMessage.set('');
    this.isYouTubeLink.set(false);

    if (this.isYouTubeUrl(text)) {
      await this.chatService.sendYouTubeMessage(text);
    } else {
      await this.chatService.sendTextMessage(text);
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

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Optionnel: afficher un feedback visuel
      console.log('Message copie dans le presse-papiers');
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
}
