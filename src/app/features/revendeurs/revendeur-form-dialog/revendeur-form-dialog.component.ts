import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { RevendeurControllerService, RevendeurResponse } from '@/app/modules/openapi';

@Component({
    selector: 'app-revendeur-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, Button, InputNumber, InputText, Textarea],
    templateUrl: 'revendeur-form-dialog.component.html'
})
export class RevendeurFormDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() revendeur: RevendeurResponse | null = null;
    @Output() saved = new EventEmitter<void>();

    saving = false;

    form = {
        nom: '',
        contact: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        codePostal: '',
        pays: 'France',
        remiseGlobale: null as number | null,
        notes: ''
    };

    get dialogHeader(): string {
        return this.revendeur ? `Modifier — ${this.revendeur.nom}` : 'Nouveau revendeur';
    }

    constructor(@Inject(RevendeurControllerService) private revendeurService: RevendeurControllerService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            if (this.revendeur) {
                this.form = {
                    nom: this.revendeur.nom ?? '',
                    contact: this.revendeur.contact ?? '',
                    email: this.revendeur.email ?? '',
                    telephone: this.revendeur.telephone ?? '',
                    adresse: this.revendeur.adresse ?? '',
                    ville: this.revendeur.ville ?? '',
                    codePostal: this.revendeur.codePostal ?? '',
                    pays: this.revendeur.pays ?? 'France',
                    remiseGlobale: this.revendeur.remiseGlobale ?? null,
                    notes: this.revendeur.notes ?? ''
                };
            } else {
                this.form = {
                    nom: '',
                    contact: '',
                    email: '',
                    telephone: '',
                    adresse: '',
                    ville: '',
                    codePostal: '',
                    pays: 'France',
                    remiseGlobale: null,
                    notes: ''
                };
            }
        }
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.form.nom) return;
        this.saving = true;

        const req = { ...this.form };
        const obs = this.revendeur?.id ? this.revendeurService.modifierrRevendeur(this.revendeur.id, req) : this.revendeurService.creerRevendeur(req);

        obs.subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit();
                this.onHide();
            },
            error: () => {
                this.saving = false;
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }
}
