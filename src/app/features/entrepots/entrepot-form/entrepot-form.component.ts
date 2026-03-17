import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import {
  EntrepotControllerService,
  EntrepotResponse,
  CreateEntrepotRequest,
  UpdateEntrepotRequest,
} from '@/app/modules/openapi';

@Component({
  selector: 'app-entrepot-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
  ],
  providers: [],
  templateUrl: './entrepot-form.component.html',
})
export class EntrepotFormComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() entrepot: EntrepotResponse | null = null;
  @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

  saving = false;

  form = {
    nom: '',
    adresse: '',
  };

  get isEdit(): boolean {
    return this.entrepot != null && this.entrepot.id != null;
  }

  get dialogTitle(): string {
    return this.isEdit ? `Modifier "${this.entrepot?.nom}"` : 'Nouvel entrepôt';
  }

  constructor(
    private entrepotService: EntrepotControllerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.form = {
        nom: this.entrepot?.nom ?? '',
        adresse: this.entrepot?.adresse ?? '',
      };
      this.cdr.detectChanges();
    }
  }

  onHide(): void { this.visibleChange.emit(false); }

  submit(ngForm: NgForm): void {
    if (ngForm.invalid) return;
    this.saving = true;

    if (this.isEdit && this.entrepot?.id) {
      const req: UpdateEntrepotRequest = {
        nom: this.form.nom,
        adresse: this.form.adresse || undefined,
      };
      this.entrepotService.modifier3(this.entrepot.id, req).subscribe({
        next: () => {
          this.saving = false;
          this.saved.emit({ success: true, message: 'Entrepôt modifié avec succès' });
        },
        error: () => {
          this.saving = false;
          this.saved.emit({ success: false, message: 'Impossible de modifier l\'entrepôt' });
        },
      });
    } else {
      const req: CreateEntrepotRequest = {
        nom: this.form.nom,
        adresse: this.form.adresse || undefined,
      };
      this.entrepotService.creer4(req).subscribe({
        next: () => {
          this.saving = false;
          this.saved.emit({ success: true, message: 'Entrepôt créé avec succès' });
        },
        error: () => {
          this.saving = false;
          this.saved.emit({ success: false, message: 'Impossible de créer l\'entrepôt' });
        },
      });
    }
  }
}
