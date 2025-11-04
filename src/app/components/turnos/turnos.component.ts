import { Component, OnInit } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { Turno } from '../../models/turnos';
import { Usuario } from '../../models/usuario';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiltroEspecialidadPipe } from '../../pipes/filtroEspecialidad.pipe';
import { FiltroEspecialistaPipe } from '../../pipes/filtroespecialista.pipe';



const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-turnos',
  imports: [CommonModule,FormsModule,FiltroEspecialidadPipe,FiltroEspecialidadPipe,FiltroEspecialistaPipe],
  templateUrl: './turnos.component.html',
  styleUrl: './turnos.component.scss'
})
export class TurnosComponent implements OnInit{

  usuario: Usuario | null =  null;
  turnos: any[] = [];

  especialistas: any[] = [];
  especialidades: string[] = [];
  sinEspecialistas: boolean = false;

  msgCancelarTurno: string = '';

  comentariosAdmin: Record<string, string> = {}; //para que pueda guardar el id del turno al q corresponde
  
  busquedaEspecialista: string = '';
  busquedaEspecialidad: string = '';

  constructor(private router: Router){}

  ngOnInit(): void {
    this.getUserData();
    this.loadEspecialidades();
    this.loadEspecialistas();
    this.loadTurnos();
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
      })
      
    });
  }


  loadEspecialidades(){
    supabase
      .from('especialidades')
      .select('id, nombre')
      .eq('habilitado', true)                    
      .then(({ data, error }) => {
        if (error) {
          console.error('Error obteniendo especialidades:', error.message);
          return;
        }

        this.especialidades = (data|| []).map(e => e.nombre); 
        console.log(this.especialidades);
      });
  }

  loadEspecialistas(){
    supabase
      .from('usuariosclinica')
      .select('id, nombre, apellido')
      .eq('habilitado', true)
      .eq('categoria','especialista')                    
      .then(({ data, error }) => {
        if (error) {
          console.error('Error obteniendo especialistas:', error.message);
          return;
        }

        this.especialistas = data || []; 
        console.log(this.especialistas);
      });
  }

  loadEspecialistasEspecialidad(nombreEspecialidad: string){
    if (!nombreEspecialidad){
      this.especialistas = [];
      this.sinEspecialistas = false;
      return;
    } 

    //  buscamos el id de la especialidad por su nombre en especialidades
    supabase
      .from('especialidades')
      .select('id')
      .eq('nombre', nombreEspecialidad)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Error obteniendo ID de la especialidad:', error?.message);
          return;
        }

        //  buscamos los usuarios de tipo especialistas que tengan ese id en su array de especialidades
        supabase
          .from('usuariosclinica')
          .select('id, nombre, apellido')
          .contains('especialidades', [data.id])
          .eq('categoria', 'especialista')
          .eq('habilitado', true)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error cargando especialistas:', error.message);
              return;
            }

            console.log('Especialistas:', data);
            this.especialistas = data || [];   
            this.sinEspecialistas = this.especialistas.length === 0; 
          });
      });
  }

  loadTurnos() {

    supabase
      .from('turnos')
      .select(`
        id,
        fecha,
        especialidad,
        estado,
        paciente_id,
        especialista_id,
        paciente:paciente_id ( nombre, apellido ),
        especialista:especialista_id ( nombre, apellido )
      `)
      .order('fecha', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando turnos:', error.message);
          this.turnos = [];
          return;
        }

        if (!data || data.length === 0) {
          this.turnos = [];
          return;
        }

        this.turnos = (data as any[]).map(t => ({
          ...t,
          paciente: t.paciente || { nombre: 'Paciente', apellido: '' },
          especialista: t.especialista || { nombre: 'Especialista', apellido: '' },
          paciente_nombre: t.paciente ? `${t.paciente.nombre} ${t.paciente.apellido}` : 'Paciente',
          especialista_nombre: t.especialista ? `${t.especialista.nombre} ${t.especialista.apellido}` : 'Especialista'
        }));
      });
  }


  cancelarTurno(turnoId: number, comentario: string) {
    this.msgCancelarTurno = '';
    
    
    if (!comentario) {
      this.msgCancelarTurno = 'Debe ingresar un comentario para cancelar el turno';
      return;
    }

    supabase
      .from('turnos')
      .update({ estado: 'cancelado', comentario: comentario })
      .eq('id', turnoId)
      .then(({ error }) => {
        if (error) {
          console.error('Error cancelando turno:', error.message);
          return;
        }
        this.loadTurnos(); 
        this.msgCancelarTurno = '';
      });
  }

}