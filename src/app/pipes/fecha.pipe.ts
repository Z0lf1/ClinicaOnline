import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fecha'
})
export class FechaPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    return turnos.filter(turno => {
      const fechaTurno = new Date(turno.fecha).toLocaleDateString('es-AR'); 
      return fechaTurno.toLowerCase().includes(busqueda.toLowerCase());
    });
  }
}

