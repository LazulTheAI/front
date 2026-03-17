import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  EntrepotControllerService,
  EntrepotResponse,
  UtilisateurResponse,
} from '@/app/modules/openapi';

interface UtilisateurAvecStatut extends UtilisateurResponse {
  assigne: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-assigner-utilisateur-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DialogModule, ButtonModule, TagModule, TooltipModule, DividerModule,
  ],
  providers: [],
  templateUrl: './assigner-utilisateur-dialog.component.html',
})
export class AssignerUtilisateurDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() entrepot: EntrepotResponse | null = null;
  @Input() tousUtilisateurs: UtilisateurResponse[] = [];
  @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

  utilisateursAvecStatut: UtilisateurAvecStatut[] = [];

  constructor(
    private entrepotService: EntrepotControllerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.buildListe();
    }
    if (changes['tousUtilisateurs'] && this.visible) {
      this.buildListe();
    }
  }

  private buildListe(): void {
    // Pour l'instant on n'a pas d'endpoint pour lister les utilisateurs d'un entrepôt
    // On affiche tous les utilisateurs actifs avec possibilité d'assigner/désassigner
    this.utilisateursAvecStatut = this.tousUtilisateurs
      .filter(u => u.actif)
      .map(u => ({ ...u, assigne: false, loading: false }));
    this.cdr.detectChanges();
  }

  onHide(): void { this.visibleChange.emit(false); }

  toggleAssignation(utilisateur: UtilisateurAvecStatut): void {
    if (!this.entrepot?.id || !utilisateur.id) return;

    utilisateur.loading = true;
    this.cdr.detectChanges();

    if (utilisateur.assigne) {
      // Désassigner
      this.entrepotService.desassigner(this.entrepot.id, utilisateur.id).subscribe({
        next: () => {
          utilisateur.assigne = false;
          utilisateur.loading = false;
          this.saved.emit({ success: true, message: `${utilisateur.nom} désassigné de ${this.entrepot!.nom}` });
          this.cdr.detectChanges();
        },
        error: () => {
          utilisateur.loading = false;
          this.saved.emit({ success: false, message: 'Impossible de désassigner cet utilisateur' });
          this.cdr.detectChanges();
        },
      });
    } else {
      // Assigner
      this.entrepotService.assigner(this.entrepot.id, utilisateur.id).subscribe({
        next: () => {
          utilisateur.assigne = true;
          utilisateur.loading = false;
          this.saved.emit({ success: true, message: `${utilisateur.nom} assigné à ${this.entrepot!.nom}` });
          this.cdr.detectChanges();
        },
        error: () => {
          utilisateur.loading = false;
          this.saved.emit({ success: false, message: 'Impossible d\'assigner cet utilisateur' });
          this.cdr.detectChanges();
        },
      });
    }
  }

  getInitiales(nom: string | undefined): string {
    if (!nom) return '?';
    return nom.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(index: number): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
    return colors[index % colors.length];
  }

  get nbAssignes(): number {
    return this.utilisateursAvecStatut.filter(u => u.assigne).length;
  }
}
