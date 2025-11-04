import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Usuario } from '../../models/usuario';
import { Turno } from '../../models/turnos';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HistoriaClinica } from '../../models/historia-clinica';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-pacientes',
  imports: [CommonModule,FormsModule,RouterLink],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss'
})
export class PacientesComponent implements OnInit{

  usuario: Usuario | null = null;
  turnosEspecialistaRealizados : Turno[] = [];
  historiasClinicasEspecialista: HistoriaClinica[] = [];
  PacientesAtendidos: Usuario[] = [];

  constructor(private router : Router){}

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
      if(this.usuario)
        this.loadTurnosRealizados(this.usuario) 
      })
      
    });
  }

  loadTurnosRealizados(usuario: Usuario){
    if(!usuario.id){
      return;
    }

    supabase
      .from("turnos")
      .select('*')
      .eq('estado','realizado')
      .eq('especialista_id',usuario.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error obteniendo especialidades:', error.message);
          return;
        }

        const idsPacientes = data.map((p: any) => p.paciente_id)
        this.loadPacientesAtendidos(idsPacientes);
        this.turnosEspecialistaRealizados = data;
        const turnosIds = data.map((t: any) => t.id);
        console.log(this.turnosEspecialistaRealizados);
        this.loadHistoriasClinicasEspecialista(turnosIds)
      });
  }

  loadPacientesAtendidos(idsPacientes: string[]){
    if(idsPacientes.length === 0){
      return;
    }

    supabase
      .from('usuariosclinica')
      .select('*')
      .in('id',idsPacientes)
      .then(({data,error}) =>{
        if(error){
          console.error('error obteniendo pacientes atendidos por el especialista',error.message);
          return;            
        }
        console.log('data',data);
        this.PacientesAtendidos = data;
      })

  }


  loadHistoriasClinicasEspecialista(turnosIds: any[]){ 
    if(turnosIds.length === 0){
      return;
    }

    supabase
      .from('historias-clinicas')
      .select('*')
      .in('turno_id', turnosIds)
      .then(({data,error}) => {
        if (error) {
          console.error('Error obteniendo especialidades:', error.message);
          return;
        }
        
        console.log('Data:',data);
        this.historiasClinicasEspecialista = data;

      })
      
  }

  getAvatarUrl(avatarUrl: string) {
    return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
  }

}
