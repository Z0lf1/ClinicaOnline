import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filtroEpecialidad',
  standalone:true,
})
export class FiltroEspecialidadPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    return turnos.filter(turnos => turnos.especialidad.toLowerCase().includes(busqueda.toLowerCase()));
  }

}
