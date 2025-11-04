import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estado'
})
export class EstadoPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    return turnos.filter(turnos => turnos.estado.toLowerCase().includes(busqueda.toLowerCase()));
  }

}
