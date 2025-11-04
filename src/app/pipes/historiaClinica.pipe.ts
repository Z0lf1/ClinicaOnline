import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'historiaClinica'
})
export class HistoriaClinicaPipe implements PipeTransform {

  transform(turnos: any[], busqueda: string): any[] {
    if (!busqueda || busqueda.trim() === '') {
      return turnos;
    }


    
    const texto = busqueda.toLowerCase();

    return turnos.filter(turno => {
      const historia = turno.historiaClinica;
      if (!historia) return false;
      
      //campos fijos
      const camposFijos = ['altura', 'peso', 'temperatura', 'presion'];
      for (const campo of camposFijos) {
        const valor = historia[campo];
        if (valor && valor.toString().toLowerCase().includes(texto)) {
          return true;
        }
      }

      // campos dinámicos 
    const datos = historia.datos_dinamicos;
    if (datos && typeof datos === 'object') {
      for (const key in datos) {
        const valor = datos[key];
        if (valor && valor.toString().toLowerCase().includes(texto)) {
          return true;
        }
      }
    }


      return false;
    });
  }
    
}
