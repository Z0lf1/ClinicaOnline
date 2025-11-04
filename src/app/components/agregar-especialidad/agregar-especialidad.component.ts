import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Usuario } from '../../models/usuario';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-agregar-especialidad',
  imports: [CommonModule,FormsModule],
  templateUrl: './agregar-especialidad.component.html',
  styleUrl: './agregar-especialidad.component.scss'
})
export class AgregarEspecialidadComponent implements OnInit{

  usuario:Usuario | null = null;
  idsEspecialidadesUsuario: string[] = [];
  especialidadesDisponibles: any[] = [];
  especialidadSeleccionada: string = '';

  msg: string = '';
  errorMsg: string = '';

  constructor(private router:Router){}

  ngOnInit(): void {
    this.getUserData();
  }

  getUserData(){
    supabase.auth.getUser().then(({data,error}) => {
      if(error){
        console.error('Error:',error.message);
        return;
      }        
      const userId = data.user.id;
      supabase.from('usuariosclinica').select('*').eq('id',userId).single().then(({data,error}) => {
        
        if(error){
          console.error('Error al obtener usuario:', error.message);
          return;
        }
        console.log('Data:',data);
        this.usuario = data; 

        this.idsEspecialidadesUsuario = data.especialidades;
        this.loadEspecialidades(this.idsEspecialidadesUsuario);

      })
      
    });
  }


  loadEspecialidades(idsEspecialidades: string[]) {
    supabase
      .from('especialidades')
      .select('id, nombre')
      .eq('habilitado', true) 
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando especialidades:', error.message);
          return;
        }


        if (data) {
          this.especialidadesDisponibles = data.filter(e => !idsEspecialidades.includes(e.id));
        } else {
          this.especialidadesDisponibles = [];
        }
      });
  }  
  
  agregarEspecialidad() {
    this.msg = '';
    this.errorMsg = '';

    const nombre = this.especialidadSeleccionada.trim();
    if (!nombre || !this.usuario){
      this.errorMsg = 'Debe seleccionar o agregar una especialidad';
      return;
    } 

    const existente = this.especialidadesDisponibles.find(e => e.nombre.toLowerCase() === nombre.toLowerCase());

    if (existente) {
      //la especialidad existe
      const nuevoArray = [...(this.usuario.especialidades || [] ), existente.id];
      supabase
        .from('usuariosclinica')
        .update({ especialidades: nuevoArray })
        .eq('id', this.usuario.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error actualizando usuario:', error.message);
          } else {
            this.usuario!.especialidades = nuevoArray; 
            this.idsEspecialidadesUsuario = nuevoArray;
            this.loadEspecialidades(nuevoArray); 
          }
        });
    } else {
      //la especialidad no existe
      supabase
        .from('especialidades')
        .insert([{ nombre, habilitado: false }])
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error insertando nueva especialidad:', error.message);
            return;
          }

          const nuevoArray = [...(this.usuario!.especialidades || []), data.id];
          supabase
            .from('usuariosclinica')
            .update({ especialidades: nuevoArray })
            .eq('id', this.usuario!.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error actualizando usuario con nueva especialidad:', error.message);
              } else {
                this.usuario!.especialidades = nuevoArray;
                this.idsEspecialidadesUsuario = nuevoArray;
                this.loadEspecialidades(nuevoArray); 
              }
            });
        });
    }
    this.msg = 'Especialidad agregada con exito';
    this.especialidadSeleccionada = ''; 
  }

}
