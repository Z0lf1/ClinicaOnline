import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoriaClinica } from '../../models/historia-clinica';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../models/usuario';
import { Turno } from '../../models/turnos';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-historias-clinicas',
  imports: [CommonModule,FormsModule],
  templateUrl: './historias-clinicas.component.html',
  styleUrl: './historias-clinicas.component.scss'
})
export class HistoriasClinicasComponent implements OnInit{

  historiasClinicasPaciente: HistoriaClinica[] = [];
  turnosHistoriasClinicas: Turno[] = [];
  paciente: Usuario | null = null;

  turnosIds: Record<number, Turno> ={};
  especialistasTurnosNombre: Record<string, string> = {};

  resenasVisibles: { [id: string]: boolean } = {};

  constructor(private route:ActivatedRoute,private router:Router){}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const pacienteId = params['pacienteId'];
      if (pacienteId) {
        this.loadHistoriasClinicasPaciente(pacienteId);
      }else{
      console.error('No se pudo cargar nada');
      }
    });        
  }

  loadHistoriasClinicasPaciente(pacienteId: string){
    if (pacienteId) {
        supabase
        .from('historias-clinicas')
        .select('*')
        .eq('paciente_id',pacienteId)
        .then(({data,error}) =>{
          if(error){
            console.error('Error al cargar historias clinicas del paciente',error.message);
            return;
          }

          const idsTurnosHistoriasClinicasPaciente = data.map((t:any) => t.turno_id);
          this.loadTurnosHistoriasClinicasPaciente(idsTurnosHistoriasClinicasPaciente);
          console.log('Historias clinicas cargadas con exito',data);
          this.historiasClinicasPaciente = data;
          this.loadPaciente(pacienteId);
        })

    }
  }

  loadTurnosHistoriasClinicasPaciente(idsTurnos:any){
    
    if(idsTurnos.length === 0){
      return;
    }

    supabase
      .from('turnos')
      .select('*')
      .in('id',idsTurnos)
      .then(({data,error}) => {
        if(error){
          console.error('Error al cargar turnos de historias clinicas del paciente');
          return;
        }

        //me guardo un id q haga referencia al turno para poder mostrar info de cada turno en html
        this.turnosIds = {};
        data.forEach(turno =>{
          this.turnosIds[turno.id] = turno;
        })
        console.log('Turnos', data);
        this.turnosHistoriasClinicas = data;

        const idsEspecialistasTurno = data.map(t => t.especialista_id);
        this.loadNombresEspecialistasTurno(idsEspecialistasTurno);
      })
  }

  loadPaciente(pacienteId: any){
    supabase
      .from('usuariosclinica')
      .select('*')
      .eq('id',pacienteId)
      .then(({data,error}) =>{
        if(error){
          console.error('Error al cargar datos del paciente');
          return;
        }

        console.log('Datos del paciente',data);
        this.paciente = data[0];
      })
  }

  loadNombresEspecialistasTurno(idsEspecialistas: number[]){
    if(idsEspecialistas.length === 0){
      return ;
    }

    supabase
      .from('usuariosclinica')
      .select('id,nombre,apellido')
      .in('id',idsEspecialistas)
      .then(({data,error}) =>{
        if(error){
          console.error('Error al traer nombre del especialista del turno',error.message);
          return;
        }
          
        data.forEach(esp => {
        this.especialistasTurnosNombre[esp.id] = `${esp.nombre} ${esp.apellido}`;
        });
      });
  }

  objectKeys(obj: Record<string, string>): string[] {
    return Object.keys(obj);
  }

  verResena(turno: any){
    this.resenasVisibles[turno.id] = !this.resenasVisibles[turno.id];
  }



}
