import { Pipe, PipeTransform } from '@angular/core';
import { UtilisateurResponse } from '@/app/modules/openapi';

@Pipe({ name: 'utilisateursInactifs', standalone: true })
export class UtilisateursInactifsPipe implements PipeTransform {
  transform(utilisateurs: UtilisateurResponse[]): UtilisateurResponse[] {
    return (utilisateurs ?? []).filter(u => !u.actif);
  }
}
