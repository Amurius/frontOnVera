import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ClusteringService } from './clustering.service';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  contentType: 'text' | 'file' | 'video' | 'youtube';
  content: string;
  fileName?: string;
  fileUrl?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private clusteringService = inject(ClusteringService);

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  currentStreamingMessage = signal<string>('');

  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return this.generateUUID();
    }

    let sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addUserMessage(content: string, contentType: 'text' | 'file' | 'video' | 'youtube' = 'text', fileName?: string, fileUrl?: string): ChatMessage {
    const message: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      contentType,
      content,
      fileName,
      fileUrl,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, message]);
    return message;
  }

  async sendTextMessage(text: string): Promise<void> {
    this.addUserMessage(text, 'text');

    // Envoie la question au clustering en parallele (fire and forget)
    this.clusteringService.submitQuestion(text).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Question enregistree dans le cluster:', response.cluster.id);
        }
      },
      error: (error) => {
        console.error('Erreur clustering (non bloquant):', error);
      }
    });

    await this.streamResponse({ type: 'text', content: text });
  }

  async sendYouTubeMessage(url: string): Promise<void> {
    this.addUserMessage(url, 'youtube');
    await this.streamYouTubeResponse(url);
  }

  async sendFileMessage(file: File): Promise<void> {
    const fileUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    const contentType = isVideo ? 'video' : 'file';

    this.addUserMessage(
      isVideo ? 'Video envoyee' : 'Fichier envoye',
      contentType,
      file.name,
      fileUrl
    );

    await this.streamResponseWithFile(file, contentType);
  }

  private async streamResponse(payload: { type: string; content: string }): Promise<void> {
    this.isLoading.set(true);
    this.currentStreamingMessage.set('');

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      contentType: 'text',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    this.messages.update(msgs => [...msgs, assistantMessage]);

    try {
      const response = await fetch(`${environment.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec le serveur');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream non disponible');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                this.updateStreamingMessage(assistantMessage.id, fullContent);
              }
            } catch {
              // Texte brut
              fullContent += data;
              this.updateStreamingMessage(assistantMessage.id, fullContent);
            }
          }
        }
      }

      this.finalizeMessage(assistantMessage.id, fullContent);
    } catch (error: any) {
      this.finalizeMessage(
        assistantMessage.id,
        error.message || 'Une erreur est survenue'
      );
    } finally {
      this.isLoading.set(false);
      this.currentStreamingMessage.set('');
    }
  }

  private async streamResponseWithFile(file: File, contentType: 'file' | 'video'): Promise<void> {
    this.isLoading.set(true);
    this.currentStreamingMessage.set('');

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      contentType: 'text',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    this.messages.update(msgs => [...msgs, assistantMessage]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', contentType);

      const response = await fetch(`${environment.apiUrl}/chat/stream-file`, {
        method: 'POST',
        headers: {
          'X-Session-Id': this.sessionId
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du fichier');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream non disponible');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                this.updateStreamingMessage(assistantMessage.id, fullContent);
              }
            } catch {
              fullContent += data;
              this.updateStreamingMessage(assistantMessage.id, fullContent);
            }
          }
        }
      }

      this.finalizeMessage(assistantMessage.id, fullContent);
    } catch (error: any) {
      this.finalizeMessage(
        assistantMessage.id,
        error.message || 'Une erreur est survenue lors du traitement du fichier'
      );
    } finally {
      this.isLoading.set(false);
      this.currentStreamingMessage.set('');
    }
  }

  private async streamYouTubeResponse(url: string): Promise<void> {
    this.isLoading.set(true);
    this.currentStreamingMessage.set('');

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      contentType: 'text',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    this.messages.update(msgs => [...msgs, assistantMessage]);

    try {
      const response = await fetch(`${environment.apiUrl}/chat/stream-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du traitement de la video YouTube');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream non disponible');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                this.updateStreamingMessage(assistantMessage.id, fullContent);
              }
            } catch {
              fullContent += data;
              this.updateStreamingMessage(assistantMessage.id, fullContent);
            }
          }
        }
      }

      this.finalizeMessage(assistantMessage.id, fullContent);
    } catch (error: any) {
      this.finalizeMessage(
        assistantMessage.id,
        error.message || 'Une erreur est survenue lors du traitement de la video YouTube'
      );
    } finally {
      this.isLoading.set(false);
      this.currentStreamingMessage.set('');
    }
  }

  private updateStreamingMessage(messageId: string, content: string): void {
    this.currentStreamingMessage.set(content);
    this.messages.update(msgs =>
      msgs.map(msg =>
        msg.id === messageId
          ? { ...msg, content, isStreaming: true }
          : msg
      )
    );
  }

  private finalizeMessage(messageId: string, content: string): void {
    this.messages.update(msgs =>
      msgs.map(msg =>
        msg.id === messageId
          ? { ...msg, content, isStreaming: false }
          : msg
      )
    );
  }

  clearMessages(): void {
    this.messages.set([]);
  }

  resetSession(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chat_session_id');
      this.sessionId = this.getOrCreateSessionId();
    }
    this.messages.set([]);
  }
}
