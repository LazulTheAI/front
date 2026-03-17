import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { SelectModule } from 'primeng/select';

import {
  EntrepotControllerService,
  EntrepotResponse,
  ManqueStockResponse,
  RecetteControllerService,
  RecetteResponse,
  SimulationCoutResponse,
} from '@/app/modules/openapi';

@Component({
  selector: 'app-simulation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TableModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './simulation-dialog.component.html',
})
export class SimulationDialogComponent implements OnChanges, OnInit {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() recette: RecetteResponse | null = null;

  entrepots: EntrepotResponse[] = [];
  simulation: SimulationCoutResponse | null = null;

  batches: number = 1;
  entrepotId: number | null = null;
  loading = false;

  constructor(
    private recetteService: RecetteControllerService,
    private entrepotService: EntrepotControllerService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.entrepotService.listerEntrepot().subscribe({
      next: (data: EntrepotResponse[]) => {
        this.entrepots = data.filter((e: EntrepotResponse) => e.actif);
        this.entrepotOptions = this.entrepots.map(e => ({ label: e.nom!, value: e.id! }));
        if (this.entrepots.length === 1) {
          this.entrepotId = this.entrepots[0].id!;
        }
        this.cdr.detectChanges();
      },
    });
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.simulation = null;
      this.batches = 1;
    }
  }

  entrepotOptions: { label: string; value: number }[] = [];


  get canSimulate(): boolean {
    return this.batches > 0 && this.entrepotId != null;
  }

  simuler(): void {
    if (!this.recette?.id || !this.entrepotId) return;

    this.loading = true;
    this.recetteService.simulationRecette(this.recette.id, this.batches, this.entrepotId).subscribe({
      next: (data: SimulationCoutResponse) => {
        this.simulation = data;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Simulation impossible' });
        this.loading = false;
      },
    });
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  get coutParUnite(): number {
    if (!this.simulation || !this.recette) return 0;
    const unitesProduite = (this.recette.quantiteProduite ?? 1) * (this.simulation.batches ?? 1);
    return unitesProduite > 0 ? (this.simulation.coutTheorique ?? 0) / unitesProduite : 0;
  }

  get hasManques(): boolean {
    return (this.simulation?.manques?.length ?? 0) > 0;
  }

  getManqueSeverity(manque: ManqueStockResponse): number {
    return manque.disponible === 0 ? 0 : (manque.disponible! / manque.besoin!) * 100;
  }
}
function parseBlob<T>(data: any): any {
  throw new Error('Function not implemented.');
}

