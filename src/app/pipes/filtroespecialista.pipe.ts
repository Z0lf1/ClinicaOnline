import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filtroEpecialista',
  standalone:true,
})
export class FiltroEspecialistaPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    return turnos.filter(turnos => turnos.especialista_nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }

}
