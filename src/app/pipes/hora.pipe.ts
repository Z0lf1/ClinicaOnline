import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hora'
})
export class HoraPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    return turnos.filter(turno => {
      const horaTurno = new Date(turno.fecha).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }); 
      return horaTurno.toLowerCase().includes(busqueda.toLowerCase());
    });
  }

}
