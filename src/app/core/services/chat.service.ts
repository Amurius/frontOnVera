import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';


export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system'; // Rôle : qui parle ?
  contentType: 'text' | 'image' | 'video' | 'file' | 'youtube'; 
  content: string;
  fileUrl?: string;  
  fileName?: string; 
  timestamp: Date;
  isStreaming?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);
  currentStreamingMessage = signal<string>('');
  
  private sessionId: string;
  private API_URL = environment.apiUrl || 'http://localhost:3000/api';

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Envoi d'un message texte (avec pays/langue)
   */
  async sendTextMessage(text: string, country: string = 'XX', lang: string = 'xx'): Promise<void> {
    if (!text.trim()) return;

    // Ajout local immédiat
    this.addMessage({
      type: 'user',
      contentType: 'text',
      content: text
    });

    this.isLoading.set(true);

    try {
      const response = await fetch(`${this.API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId
        },
        body: JSON.stringify({ message: text, country, lang })
      });

      await this.handleStreamResponse(response);

    } catch (error) {
      console.error('Erreur envoi message:', error);
      this.addSystemMessage("Erreur lors de l'envoi du message.");
      this.isLoading.set(false);
    }
  }

  /**
   * Envoi d'un fichier (Image/Vidéo/PDF)
   */
  async sendFileMessage(file: File): Promise<void> {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    // Création d'une URL locale pour l'affichage immédiat dans le chat
    const tempUrl = URL.createObjectURL(file);

    this.addMessage({
      type: 'user',
      contentType: isImage ? 'image' : (isVideo ? 'video' : 'file'),
      content: isImage ? 'Image envoyée' : `Fichier : ${file.name}`,
      fileUrl: tempUrl,
      fileName: file.name
    });

    this.isLoading.set(true);

    const formData = new FormData();
    formData.append('file', file);
    // On pourrait ajouter country/lang ici aussi si le backend le gère

    try {
      // Attention: la route doit matcher celle de ton backend (/upload)
      const response = await fetch(`${this.API_URL}/chat/upload`, {
        method: 'POST',
        headers: { 'X-Session-Id': this.sessionId },
        body: formData
      });

      if (!response.ok) throw new Error('Erreur upload');
      await this.handleStreamResponse(response);

    } catch (error) {
      console.error('Erreur envoi fichier:', error);
      this.addSystemMessage("Erreur lors de l'envoi du fichier.");
      this.isLoading.set(false);
    }
  }

  /**
   * Envoi d'une URL YouTube
   */
  async sendYouTubeMessage(url: string): Promise<void> {
    this.addMessage({
      type: 'user',
      contentType: 'youtube',
      content: url
    });

    this.isLoading.set(true);

    try {
      const response = await fetch(`${this.API_URL}/chat/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId
        },
        body: JSON.stringify({ url })
      });

      await this.handleStreamResponse(response);

    } catch (error) {
      console.error('Erreur YouTube:', error);
      this.addSystemMessage("Impossible d'analyser la vidéo YouTube.");
      this.isLoading.set(false);
    }
  }

  /**
   * Réinitialise la session
   */
  resetSession(): void {
    this.messages.set([]);
    this.currentStreamingMessage.set('');
    this.isLoading.set(false);
    this.sessionId = this.generateId();
    localStorage.setItem('chat_session_id', this.sessionId);
  }

  // --- Méthodes Privées (Helpers) ---

  private addMessage(msg: Partial<ChatMessage>) {
    this.messages.update(msgs => [
      ...msgs,
      {
        id: this.generateId(),
        type: msg.type || 'user',
        contentType: msg.contentType || 'text',
        content: msg.content || '',
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        timestamp: new Date()
      } as ChatMessage
    ]);
  }

  private addSystemMessage(content: string) {
    this.addMessage({ type: 'system', contentType: 'text', content });
  }

  private async handleStreamResponse(response: Response) {
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    
    // Création du message assistant vide
    const assistantMsgId = this.generateId();
    this.messages.update(msgs => [
      ...msgs,
      {
        id: assistantMsgId,
        type: 'assistant',
        contentType: 'text',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }
    ]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Nettoyage basique si format SSE "data: ..."
        let cleanChunk = chunk;
        if (chunk.includes('data: ')) {
           // Extraction simple du JSON ou texte brut
           const lines = chunk.split('\n');
           cleanChunk = lines
             .filter(line => line.startsWith('data: '))
             .map(line => {
               const dataStr = line.replace('data: ', '').trim();
               if (dataStr === '[DONE]') return '';
               try {
                 const json = JSON.parse(dataStr);
                 return json.content || '';
               } catch {
                 return dataStr;
               }
             })
             .join('');
        }

        fullContent += cleanChunk;
        this.currentStreamingMessage.set(fullContent);
        
        // Mise à jour temps réel dans la liste
        this.messages.update(msgs => 
          msgs.map(msg => 
            msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
          )
        );
      }
    } catch (e) {
      console.error("Erreur lecture stream", e);
    } finally {
      this.currentStreamingMessage.set('');
      this.isLoading.set(false);
      // Marquer comme fini
      this.messages.update(msgs => 
        msgs.map(msg => msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg)
      );
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof localStorage !== 'undefined') {
      let id = localStorage.getItem('chat_session_id');
      if (!id) {
        id = this.generateId();
        localStorage.setItem('chat_session_id', id);
      }
      return id;
    }
    return this.generateId();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}