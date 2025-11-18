import { Component, OnInit } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { Usuario } from '../../models/usuario';
import { Turno } from '../../models/turnos';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MisTurnosComponent } from '../mis-turnos/mis-turnos.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoriaClinica } from '../../models/historia-clinica';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-perfil',
  imports: [CommonModule,FormsModule,RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit{

  usuario: Usuario | null = null;
  historiasClinicasPaciente: HistoriaClinica [] = [];
  especialistasAtendieronPaciente: {[id: string]: {nombre: string; apellido: string} } = {};

  diasDeSemana: string[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes','Sabado'];
  disponibilidad: { dia: string, horas: [string, string] }[] = [];

  disponibilidadEditable: { dia: string, hora_inicio: string, hora_fin: string }[] = [];

  especialidadesDisponibles: string[] = [];

  mostrarSelectorDescarga = false;
  especialistaSeleccionado: string = 'todos';

  constructor(private router: Router){}

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

        if (this.usuario?.categoria === 'especialista') {
          this.loadDisponibilidad();
          this.loadEspecialidades();
        }
        else if(this.usuario?.categoria === 'paciente'){
          this.loadEspecialistasAtendieronPaciente();
        }

      })
      
    });
  }

  getAvatarUrl(avatarUrl: string) {
    return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
  }

  loadDisponibilidad() {
    if (!this.usuario?.id) {
      console.error('No hay usuario cargado');
      return;
    }

    supabase
      .from('disponibilidad')
      .select('*')
      .eq('especialista_id', this.usuario.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar disponibilidad:', error.message);
          return;
        }

        if (data && data.length > 0) {
          this.disponibilidad = data
            .filter(item => item.hora_inicio && item.hora_fin) 
            .sort((a, b) => this.diasDeSemana.indexOf(a.dia) - this.diasDeSemana.indexOf(b.dia)) // ordenamos por día
            .map(item => ({
              dia: item.dia,
              horas: [item.hora_inicio, item.hora_fin]as [string, string]
            }));
        } else {
          this.disponibilidad = [];
          console.log('El especialista aún no cargó disponibilidad.');
        }
      });
  }

  loadEspecialidades(){
    const idsEspecialidades = this.usuario?.especialidades || [];

    if (idsEspecialidades.length === 0) return;
    
    supabase
      .from('especialidades')
      .select('id, nombre')
      .in('id', idsEspecialidades)               
      .eq('habilitado', true)                    
      .then(({ data, error }) => {
        if (error) {
          console.error('Error obteniendo especialidades:', error.message);
          return;
        }

        this.especialidadesDisponibles = (data|| []).map(e => e.nombre); 
        console.log(this.especialidadesDisponibles);
      });  
  }

  loadEspecialistasAtendieronPaciente() {
    if (!this.usuario || this.usuario.categoria !== 'paciente') return;

    supabase
      .from('historias_clinicas')
      .select(`
        turno:turno_id (
          especialista:especialista_id ( id, nombre, apellido )
        )
      `)
      .eq('paciente_id', this.usuario.id)
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Error al cargar historias clínicas:', error);
          return;
        }

        const especialistasUnicos: { [key: string]: { nombre: string; apellido: string } } = {};

        for (const historia of data) {
          const turno = (historia as any).turno;
          const especialista = turno?.especialista;
          if (especialista && !especialistasUnicos[especialista.id]) {
            especialistasUnicos[especialista.id] = { nombre: especialista.nombre, apellido: especialista.apellido };
          }
        }

        this.especialistasAtendieronPaciente = especialistasUnicos;
      });
  }

  DescargarHistoriaClinica(){
  
  if (!this.usuario || this.usuario.categoria !== 'paciente') return;

  supabase
    .from('historias_clinicas')
    .select(`
      *, 
      turno:turno_id (
        fecha, 
        especialidad,
        "reseña", 
        especialista:especialista_id ( nombre, apellido )
      )
    `)
    .eq('paciente_id', this.usuario.id)
    .then(({ data, error }) => {
      if (error || !data || data.length === 0) return;

      const historiasOrdenadas = data.sort((a, b) => {
        const fechaA = new Date(a.turno.fecha);
        const fechaB = new Date(b.turno.fecha);
        return fechaA.getTime() - fechaB.getTime();
      });
      
      const doc = new jsPDF();
      
      doc.addImage('assets/logo-clinica.png', 'PNG', 15, 10, 30, 15); 
      doc.setFontSize(10);
      doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 150, 10);
      doc.setFontSize(16);
      doc.text(`Historia Clínica de ${this.usuario?.nombre} ${this.usuario?.apellido}`, 60, 25);


      let y = 40;

      historiasOrdenadas.forEach((h: any, i: number) => {
        const t = h.turno;
        const fechaTurno = new Date(t.fecha).toLocaleDateString();
        const horaTurno = new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const espNombre = t.especialidad;
        const prof = t.especialista ? `${t.especialista.nombre} ${t.especialista.apellido}` : '—';

        doc.setFontSize(12);
        doc.text(`Atención ${i + 1} — ${fechaTurno} ${horaTurno}`, 15, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(`Especialidad: ${espNombre}`, 15, y);
        y += 5;
        doc.text(`Profesional: ${prof}`, 15, y);
        y += 7;

        doc.text(`Altura: ${h.altura} cm`, 15, y); y += 5;
        doc.text(`Peso: ${h.peso} kg`, 15, y); y += 5;
        doc.text(`Temp: ${h.temperatura} °C`, 15, y); y += 5;
        doc.text(`Presión: ${h.presion}`, 15, y); y += 7;

        if (h.datos_dinamicos) {
          Object.keys(h.datos_dinamicos).forEach(k => {
            doc.text(`${k}: ${h.datos_dinamicos[k]}`, 15, y); y += 5;
          });
          y += 2;
        }

        if (t.reseña) {
          doc.text(`Reseña del Especialista: ${t.reseña}`, 15, y); y += 10; 
        }

        if (y > 260) { doc.addPage(); y = 20; }
      });

      if(this.usuario){
        doc.save(`historia_clinica_${this.usuario.nombre}_${this.usuario.apellido}.pdf`);
      }
  
    });
  }

  DescargarHistoriaClinicaPorEspecialista(especialistaId: string){
  
  if (!this.usuario || this.usuario.categoria !== 'paciente') return;

  supabase
    .from('historias_clinicas')
    .select(`
      *, 
      turno:turno_id (
        fecha, 
        especialidad,
        "reseña", 
        especialista:especialista_id ( id,nombre, apellido )
      )
    `)
    .eq('paciente_id', this.usuario.id)
    .then(({ data, error }) => {
      if (error || !data || data.length === 0) return;

      const filtradas = data.filter(h => h.turno?.especialista?.id === especialistaId);

      if (filtradas.length === 0) return;

      const historiasOrdenadas = filtradas.sort((a, b) => {
        const fechaA = new Date(a.turno.fecha);
        const fechaB = new Date(b.turno.fecha);
        return fechaA.getTime() - fechaB.getTime();
      });
      
      const especialista = filtradas[0].turno.especialista;
      const nombreEspecialista = especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Especialista';

      const doc = new jsPDF();
      
      doc.addImage('assets/logo-clinica.png', 'PNG', 15, 10, 30, 15); 
      doc.setFontSize(10);
      doc.text(`Emitido: ${new Date().toLocaleDateString()}`, 150, 10);
      doc.setFontSize(16);
      doc.text(`Turnos tomados con ${nombreEspecialista}`, 60, 25);


      let y = 40;

      historiasOrdenadas.forEach((h: any, i: number) => {
        const t = h.turno;
        const fechaTurno = new Date(t.fecha).toLocaleDateString();
        const horaTurno = new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const espNombre = t.especialidad;
        const prof = t.especialista ? `${t.especialista.nombre} ${t.especialista.apellido}` : '—';

        doc.setFontSize(12);
        doc.text(`Atención ${i + 1} — ${fechaTurno} ${horaTurno}`, 15, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(`Especialidad: ${espNombre}`, 15, y);
        y += 7;
        

        doc.text(`Altura: ${h.altura} cm`, 15, y); y += 5;
        doc.text(`Peso: ${h.peso} kg`, 15, y); y += 5;
        doc.text(`Temp: ${h.temperatura} °C`, 15, y); y += 5;
        doc.text(`Presión: ${h.presion}`, 15, y); y += 7;

        if (h.datos_dinamicos) {
          Object.keys(h.datos_dinamicos).forEach(k => {
            doc.text(`${k}: ${h.datos_dinamicos[k]}`, 15, y); y += 5;
          });
          y += 2;
        }

        if (t.reseña) {
          doc.text(`Reseña del Especialista: ${t.reseña}`, 15, y); y += 10; 
        }

        if (y > 260) { doc.addPage(); y = 20; }
      });

      if(this.usuario){
        doc.save(`Turnos tomados con_ ${nombreEspecialista}.pdf`);
      }
  
    });
  }

  abrirSelectorDescarga() {
    this.mostrarSelectorDescarga = true;
    this.especialistaSeleccionado = 'todos';

    
  }

  cerrarSelectorDescarga() {
    this.mostrarSelectorDescarga = false;
  }

  confirmarDescarga() {
    this.mostrarSelectorDescarga = false;

    if (this.especialistaSeleccionado === 'todos') {
      this.DescargarHistoriaClinica();
    } else {
      this.DescargarHistoriaClinicaPorEspecialista(this.especialistaSeleccionado);
    }
  }

  getEspecialistaIds(): string[] {
    return Object.keys(this.especialistasAtendieronPaciente || {});
  }

}
