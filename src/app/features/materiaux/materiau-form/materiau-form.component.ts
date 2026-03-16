import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

// PrimeNG
import { CreerMateriauRequest, MateriauControllerService, MateriauResponse, ModifierMateriauRequest } from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';


@Component({
  selector: 'app-materiau-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    ToastModule,
    DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './materiau-form.component.html',
})
export class MateriauFormComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() materiau: MateriauResponse | null = null;
  @Output() saved = new EventEmitter<void>();

  saving = false;

  form = {
    nom: '',
    unite: '',
    coutUnitaire: null as number | null,
    seuilAlerte: null as number | null,
  };

  get isEdit(): boolean {
    return this.materiau != null && this.materiau.id != null;
  }

  get dialogTitle(): string {
    return this.isEdit ? 'Modifier le matériau' : 'Nouveau matériau';
  }

  constructor(
    private materiauService: MateriauControllerService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['materiau'] || changes['visible']) {
      if (this.visible) {
        this.resetForm();
      }
    }
  }

  private resetForm(): void {
    if (this.isEdit && this.materiau) {
      this.form = {
        nom: this.materiau.nom ?? '',
        unite: this.materiau.unite ?? '',
        coutUnitaire: this.materiau.coutUnitaire ?? null,
        seuilAlerte: this.materiau.seuilAlerte ?? null,
      };
    } else {
      this.form = { nom: '', unite: '', coutUnitaire: null, seuilAlerte: null };
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  submit(ngForm: NgForm): void {
    if (ngForm.invalid) return;

    this.saving = true;

    if (this.isEdit && this.materiau?.id) {
      const req: ModifierMateriauRequest = {
        nom: this.form.nom,
        unite: this.form.unite,
        coutUnitaire: this.form.coutUnitaire ?? undefined,
        seuilAlerte: this.form.seuilAlerte ?? undefined,
      };
      this.materiauService.modifier(this.materiau.id, req).subscribe({
        next: () => this.handleSuccess('Matériau modifié avec succès'),
        error: () => this.handleError(),
      });
    } else {
      const req: CreerMateriauRequest = {
        nom: this.form.nom,
        unite: this.form.unite,
        coutUnitaire: this.form.coutUnitaire ?? undefined,
        seuilAlerte: this.form.seuilAlerte ?? undefined,
      };
      this.materiauService.creer2(req).subscribe({
        next: () => this.handleSuccess('Matériau créé avec succès'),
        error: () => this.handleError(),
      });
    }
  }

  private handleSuccess(msg: string): void {
    this.saving = false;
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
    this.saved.emit();
  }

  private handleError(): void {
    this.saving = false;
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
  }
}
