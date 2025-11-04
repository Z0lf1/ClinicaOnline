import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabilitadoDirective } from '../../directivas/Habilitado.directive';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-especialidades',
  imports: [CommonModule,FormsModule,HabilitadoDirective],
  templateUrl: './especialidades.component.html',
  styleUrl: './especialidades.component.scss'
})
export class EspecialidadesComponent implements OnInit{

  constructor(private router : Router){}

  ngOnInit() {
    this.loadEspecialidades();
  }

  especialidades: any [] = [];

  //trae todos los usuarios a excepcion del logueado
    loadEspecialidades(){
      
      supabase
        .from('especialidades')
        .select('*')                   
        .then(({ data, error }) => {
          if (error) {
            console.error('Error obteniendo especialidades:', error.message);
            return;
          }

          this.especialidades = data; 
          console.log(this.especialidades);
        });
    }

  actualizarEstado(esp: any) {
    const nuevoEstado = !esp.habilitado;

    supabase.from('especialidades')
      .update({ habilitado: nuevoEstado })
      .eq('id', esp.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al actualizar estado:', error.message);
          return;
        }

        esp.habilitado = nuevoEstado;
      });
  }
  
}
