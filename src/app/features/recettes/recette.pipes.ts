import { IngredientResponse, RecetteResponse } from '@/app/modules/openapi';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Retourne les recettes ayant au moins un ingrédient en alerte stock.
 * Usage : {{ recettes | recettesEnAlerte }}
 */
@Pipe({ name: 'recettesEnAlerte', standalone: true })
export class RecettesEnAlertePipe implements PipeTransform {
  transform(recettes: RecetteResponse[]): RecetteResponse[] {
    return (recettes ?? []).filter(
      (r: RecetteResponse) =>
        !r.archive && r.ingredients?.some((i: IngredientResponse) => i.enAlerte)
    );
  }
}

/**
 * Retourne les ingrédients en alerte stock d'une recette.
 * Usage : {{ recette.ingredients | ingredientsEnAlerte }}
 */
@Pipe({ name: 'ingredientsEnAlerte', standalone: true })
export class IngredientsEnAlertePipe implements PipeTransform {
  transform(ingredients: IngredientResponse[] | undefined): IngredientResponse[] {
    return (ingredients ?? []).filter((i: IngredientResponse) => i.enAlerte);
  }
}
