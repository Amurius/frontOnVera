import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  // Cle secrete pour le cryptage depuis l'environnement
  private readonly SECRET_KEY = environment.cryptoKey;

  // Encode un ID en base64 avec obfuscation
  encryptId(id: string): string {
    try {
      // Ajouter un prefixe aleatoire et la cle pour obfusquer
      const timestamp = Date.now().toString(36);
      const payload = `${timestamp}:${id}:${this.SECRET_KEY.substring(0, 4)}`;
      // Encoder en base64 et rendre URL-safe
      const encoded = btoa(payload)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      return encoded;
    } catch (error) {
      console.error('Erreur lors du cryptage:', error);
      return '';
    }
  }

  // Decode un ID crypte
  decryptId(encryptedId: string): string {
    try {
      // Restaurer le format base64 standard
      let base64 = encryptedId
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      // Ajouter le padding si necessaire
      while (base64.length % 4) {
        base64 += '=';
      }
      // Decoder
      const decoded = atob(base64);
      // Extraire l'ID (format: timestamp:id:key)
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        return parts[1];
      }
      return '';
    } catch (error) {
      console.error('Erreur lors du decryptage:', error);
      return '';
    }
  }
}
