import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { EntrepotControllerService, EntrepotResponse } from '@/app/modules/openapi';

const STORAGE_KEY = 'mobile_entrepot_id';

@Injectable({ providedIn: 'root' })
export class MobileEntrepotService {
    private _entrepots$ = new BehaviorSubject<EntrepotResponse[]>([]);
    private _selected$ = new BehaviorSubject<EntrepotResponse | null>(null);
    private loaded = false;

    readonly entrepots$ = this._entrepots$.asObservable();
    readonly selected$ = this._selected$.asObservable();

    get selected(): EntrepotResponse | null {
        return this._selected$.value;
    }

    constructor(private entrepotService: EntrepotControllerService) {}

    load(): void {
        if (this.loaded) return;
        this.loaded = true;

        this.entrepotService.listerEntrepot().subscribe({
            next: (data: any) => {
                const all: EntrepotResponse[] = Array.isArray(data)
                    ? data
                    : (data.content ?? data.items ?? []);
                const actifs = all.filter((e) => e.actif);
                this._entrepots$.next(actifs);

                const savedId = localStorage.getItem(STORAGE_KEY);
                const saved = savedId ? actifs.find((e) => String(e.id) === savedId) : null;
                this._selected$.next(saved ?? actifs[0] ?? null);
            }
        });
    }

    select(entrepot: EntrepotResponse): void {
        this._selected$.next(entrepot);
        if (entrepot.id != null) {
            localStorage.setItem(STORAGE_KEY, String(entrepot.id));
        }
    }
}
