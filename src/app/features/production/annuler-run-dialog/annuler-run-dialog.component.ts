import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import {
  AnnulerRunRequest,
  ProductionControllerService,
  RunProductionResponse,
} from '@/app/modules/openapi';

@Component({
  selector: 'app-annuler-run-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
  ],
  providers: [],
  templateUrl: './annuler-run-dialog.component.html',
})
export class AnnulerRunDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() run: RunProductionResponse | null = null;
  @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

  saving = false;
  raison = '';

  constructor(
    private productionService: ProductionControllerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.raison = '';
      this.cdr.detectChanges();
    }
  }

  onHide(): void { this.visibleChange.emit(false); }

  submit(): void {
    if (!this.run?.id) return;
    this.saving = true;

    const req: AnnulerRunRequest = {
      raison: this.raison || undefined,
    };

    this.productionService.annulerRunProduction(this.run.id, req).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit({ success: true, message: `Run #${this.run!.id} annulé` });
      },
      error: () => {
        this.saving = false;
        this.saved.emit({ success: false, message: 'Impossible d\'annuler ce run' });
      },
    });
  }
}
