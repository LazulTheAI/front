import { StockParEntrepot } from '@/app/modules/openapi';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe utilitaire : calcule le stock total toutes entrepôts confondus.
 * Usage : {{ materiau.stocks | stockTotal }}
 */
@Pipe({
  name: 'stockTotal',
  standalone: true,
})
export class StockTotalPipe implements PipeTransform {
  transform(stocks: StockParEntrepot[] | undefined | null): number {
    if (!stocks) return 0;
    return stocks.reduce((sum, s) => sum + (s.stockActuel ?? 0), 0);
  }
}

/**
 * Pipe utilitaire : retourne les matériaux en alerte.
 * Usage : {{ materiaux | alertMateriaux }}
 */
@Pipe({
  name: 'alertMateriaux',
  standalone: true,
})
export class AlertMateriauxPipe implements PipeTransform {
  transform(materiaux: any[]): any[] {
    return (materiaux ?? []).filter((m) => m.enAlerte && !m.archive);
  }
}
