import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Usuario } from '../../models/usuario';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import {saveAs} from 'file-saver';
import { CategoriaDirective } from '../../directivas/Categoria.directive';


const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule,FormsModule,RouterLink,CategoriaDirective],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent implements OnInit{
  
  constructor(private router : Router){}

  ngOnInit() {
    this.getUsersData();
    this.loadEspecialidades();
  }

  usuarios: Usuario [] = [];
  especialidades: { [id: string]: string } = {};
  turnoRealizadosPaciente: any[] = [];


  //trae todos los usuarios a excepcion del logueado
  getUsersData(){
    supabase.auth.getUser().then(({data,error}) => {
      if(error){
        console.error('Error:',error.message);
        return;
      }        
      const adminId = data.user.id;

      supabase.from('usuariosclinica').select('*').neq('id', adminId).then(({data,error}) => {
        if(error){
          console.error('Error al obtener usuarios:', error.message);
          return;
        }  
        console.log('Usuarios:', data);
        if(data && data.length > 0 ){
          for (var i = 0; i < data.length - 1; i++) {
            for (var j = 0; j < data.length - 1 - i; j++) {
              if (this.categoriaOrden(data[j].categoria) > this.categoriaOrden(data[j + 1].categoria)) {
                var temp = data[j];
                data[j] = data[j + 1];
                data[j + 1] = temp;
              }
            }
          }
          this.usuarios = data;
        }  
      });
    });
  }

  categoriaOrden(categoria: string): number {
    if (categoria === 'paciente') return 0;
    if (categoria === 'especialista') return 1;
    if (categoria === 'administrador') return 2;
    return 3; // Para cualquier otro caso
  }

  loadEspecialidades() {
    supabase
      .from('especialidades')
      .select('id, nombre')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar especialidades:', error.message);
          return;
        }

        if (data) {
          for (let i = 0; i < data.length; i++) {
            const esp = data[i];
            this.especialidades[esp.id] = esp.nombre;
          }
        }
      });
  }


  actualizarEstado(usuario: Usuario) {
    const nuevoEstado = !usuario.habilitado;

    supabase.from('usuariosclinica')
      .update({ habilitado: nuevoEstado })
      .eq('id', usuario.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al actualizar estado:', error.message);
          return;
        }

        usuario.habilitado = nuevoEstado;
      });
  }

  descargarExcelUsuarios() {
    const datosParaExcel = this.usuarios.map(usuario => ({
      Nombre: usuario.nombre,
      Apellido: usuario.apellido,
      Email: usuario.email,
      DNI: usuario.dni,
      "Obra social": usuario.obra_social,
      "Tipo de Usuario": usuario.categoria,
      Especialidades: (usuario.categoria === 'especialista' && usuario.especialidades && usuario.especialidades.length)
        ? usuario.especialidades.map(id => this.especialidades[id] || id)
            .join(', ')
        : '',
      
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'usuarios.xlsx');
  }

  descargarExcelTurnos(usuario:Usuario){
      
    if(!usuario || usuario.categoria !== 'paciente'){
      return;
    }

    supabase
      .from('turnos')
      .select('fecha, especialidad, especialista_id')
      .eq('paciente_id',usuario.id)
      .eq('estado','realizado')
      .then(({data, error}) => {
        if(error){
          console.error('Error al cargar turnos del paciente', error.message);
          return;
        }

        if(!data || !data.length){
          console.warn('Este paciente no tiene turnos realizados');
          return;
        }

        const especialistasIds = data.map(t => t.especialista_id);
        
        supabase
          .from('usuariosclinica')
          .select('id, nombre, apellido')
          .in('id', especialistasIds)
          .then(({ data: especialistas, error: errorUsuarios }) => {
            if (errorUsuarios) {
              return;
            }

            const nombreEspecialistas = data.map(t =>
              (especialistas.find(e => e.id === t.especialista_id) || { nombre: '', apellido: '' })
            ).map(e => `${e.nombre} ${e.apellido}`.trim());

            const datosParaExcel = data.map((turno,i) => {
              const fechaObj = new Date(turno.fecha);
              return {
                Fecha: fechaObj.toLocaleDateString(),
                Hora: fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                Especialidad: turno.especialidad,
                Especialista:  nombreEspecialistas[i] || 'Desconocido'
                
              };
            });  
            
            const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(blob, `turnos_${usuario.nombre}_${usuario.apellido}.xlsx`); 
        
        });
      
      });
  }

  getAvatarUrl(avatarUrl: string) {
    return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
  }

}