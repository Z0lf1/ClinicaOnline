import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filtroEpecialistaPaciente',
  standalone:true,
})
export class FiltroEspecialistaPacientePipe implements PipeTransform {

  transform(turnos: any[], busqueda: string, categoria: any): any[] {
    
    if(categoria === 'especialista'){
      return turnos.filter(turnos => turnos.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase()));
    } else if(categoria === 'paciente'){
        return turnos.filter(turnos => turnos.especialista_nombre.toLowerCase().includes(busqueda.toLowerCase()));
      } else{
          return turnos;
        }
  }

}
