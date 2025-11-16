import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { Turno } from '../../models/turnos';
import { Router } from '@angular/router';
import { Usuario } from '../../models/usuario';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaptchaService } from '../../services/captcha.service';
import { Subscription } from 'rxjs';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-solicitar-turno',
  standalone:true,
  imports: [CommonModule,FormsModule],
  templateUrl: './solicitar-turno.component.html',
  styleUrl: './solicitar-turno.component.scss'
})
export class SolicitarTurnoComponent implements OnInit, AfterViewInit, OnDestroy{

    usuario: Usuario | null = null;
    captchaCompletado: boolean = false;
    captchaHabilitado: boolean = true;
    private captchaSubscription?: Subscription;
    turno: Turno = {
      paciente_id: '',
      especialista_id: '',
      especialidad: '',
      fecha: ''
    }as Turno;
    pacientes: Usuario [] = [];
    especialistasPorEspecialidad: Usuario[] = [];
    especialistas: Usuario[] = [];

    especialidadesDisponibles: string[] = [];
    especialidadesPorEspecialista:{ id: string, nombre: string, url_img1?: string }[] = [];

    cargaDisponibilidad: boolean = false;
    diasDisponibles: { fecha: string, textoVisible: string }[] = [];          // Días habilitados por el especialista
    horasDisponibles: Record<string, string[]> = {};  
    fechasPosibles: string[] = [];

    diaSeleccionado: string = '';
    horaSeleccionada: string = '';

    sinEspecialistas: boolean = false;
    sinDisponibilidadHoraria: boolean = false;

    constructor(
      private router : Router,
      private captchaService: CaptchaService
    ){}
  
    ngOnInit(){
      this.getUserData();
      this.captchaSubscription = this.captchaService.captchaHabilitado$.subscribe(
        habilitado => {
          this.captchaHabilitado = habilitado;
          if (!habilitado) {
            this.captchaCompletado = true; // Si está deshabilitado, considerar como completado
          } else {
            this.captchaCompletado = false; // Si se habilita, resetear
          }
        }
      );
    }

    ngOnDestroy() {
      this.captchaSubscription?.unsubscribe();
    }

    ngAfterViewInit() {
      if (this.captchaHabilitado) {
        this.renderizarCaptcha();
      }
    }

    renderizarCaptcha() {
      if (!this.captchaHabilitado) {
        return;
      }

      const checkInterval = setInterval(() => {
        const captchaDiv = document.getElementById('captcha');
        const captchaPacienteDiv = document.getElementById('captcha-paciente');
        
        if ((captchaDiv || captchaPacienteDiv) && (window as any).grecaptcha) {
          if (captchaDiv && !captchaDiv.hasChildNodes()) {
            try {
              (window as any).grecaptcha.render('captcha', {
                'sitekey': '6Le9HA4sAAAAABU7Wg6hc1Vlznz-vuPxySrg-CLB',
                'callback': () => this.onCaptchaResolved()
              });
            } catch (e) {
              console.error('Error renderizando captcha:', e);
            }
          }
          if (captchaPacienteDiv && !captchaPacienteDiv.hasChildNodes()) {
            try {
              (window as any).grecaptcha.render('captcha-paciente', {
                'sitekey': '6Le9HA4sAAAAABU7Wg6hc1Vlznz-vuPxySrg-CLB',
                'callback': () => this.onCaptchaResolved()
              });
            } catch (e) {
              console.error('Error renderizando captcha paciente:', e);
            }
          }
          if ((captchaDiv?.hasChildNodes() || captchaPacienteDiv?.hasChildNodes()) && 
              (captchaDiv?.offsetParent !== null || captchaPacienteDiv?.offsetParent !== null)) {
            clearInterval(checkInterval);
          }
        }
      }, 500);
      
      // Limpiar el intervalo después de 10 segundos para evitar loops infinitos
      setTimeout(() => clearInterval(checkInterval), 10000);
    }

    onCaptchaResolved() {
      this.captchaCompletado = true;
    }

    resetearCaptcha() {
      this.captchaCompletado = false;
      // Limpiar el contenido del captcha para que se renderice de nuevo
      const captchaDiv = document.getElementById('captcha');
      const captchaPacienteDiv = document.getElementById('captcha-paciente');
      
      if (captchaDiv) {
        captchaDiv.innerHTML = '';
      }
      
      if (captchaPacienteDiv) {
        captchaPacienteDiv.innerHTML = '';
      }
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

          if(this.esAdmin()){
            this.loadPacientes();
            this.loadEspecialidades();
          }
          else{
            this.loadEspecialistas();
          }

        })
        
      });
    }
    
    esAdmin(): boolean {
      return this.usuario?.categoria === 'administrador';
    }

    loadPacientes(){
      if(!this.usuario?.id){
        return;
      }

      supabase
        .from('usuariosclinica')
        .select('id, nombre, apellido, dni')
        .eq('categoria','paciente')                   
        .then(({ data, error }) => {
          if (error) {
            console.error('Error obteniendo pacientes:', error.message);
            return;
          }

          this.pacientes = (data || []) as Usuario []; 
          console.log(this.especialistas);
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

          this.especialidadesDisponibles = (data|| []).map(e => e.nombre); 
          console.log(this.especialidadesDisponibles);
        });
    }

    loadEspecialidadesPorEspecialista(espIds: string[]){
      if(!espIds.length){
        return;
      }

      supabase
        .from('especialidades')
        .select('id, nombre,url_img1')
        .eq('habilitado', true)
        .in('id',espIds)
        .then(({data,error}) =>{
          if(error){
            console.error('Error al cargar especialidades del especialista', error.message);
            return;
          }
          this.especialidadesPorEspecialista = (data || []);
        })
    }

    loadEspecialistas(){
      supabase
        .from('usuariosclinica')
        .select('id, nombre, apellido, url_img1, especialidades')
        .eq('categoria', 'especialista')
        .eq('habilitado', true)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error cargando especialistas:', error.message);
            return;
          }
          console.log('Especialistas:', data);
          this.especialistas = data as Usuario[]; 
        });      
    }

    loadEspecialistasPorEspecialidad(nombreEspecialidad: string){
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
              this.especialistasPorEspecialidad = data as Usuario[];
              this.sinEspecialistas = this.especialistasPorEspecialidad.length === 0; 
              this.sinDisponibilidadHoraria = false;
            });
        });
    } 

    loadDisponibilidad(especialistaId :string){
      this.cargaDisponibilidad = true;
      supabase
        .from('disponibilidad')
        .select('dia, hora_inicio, hora_fin')
        .eq('especialista_id', especialistaId)
        .then(({ data, error }) => {
          if (error || !data || data.length === 0) {
            console.error('Error cargando disponibilidad:', error?.message);
            this.diasDisponibles = [];
            this.horasDisponibles = {};
            this.sinDisponibilidadHoraria = true;
            return;
          }

          this.sinDisponibilidadHoraria = false;

          const proximosDias = this.getFechasProximas(15);
          const disponibilidad = data;

          const fechasFiltradas = proximosDias.filter(fecha => { 
            const nombreDia = this.obtenerNombreDia(fecha).toLowerCase().trim();
            const disp = disponibilidad.find(d => d.dia.toLowerCase().trim() === nombreDia);

            if (!disp) return false;

            
            if (!disp.hora_inicio || !disp.hora_fin || disp.hora_inicio === disp.hora_fin) {
              return false;
            }

            return true;  
          });

          if (fechasFiltradas.length === 0) { 
            this.diasDisponibles = [];
            this.horasDisponibles = {};
            this.sinDisponibilidadHoraria = true;
            return;
          }

          const fechasStr = fechasFiltradas.map(f => f.toISOString().split('T')[0]); 


          supabase
            .from('turnos')
            .select('fecha')
            .eq('especialista_id', especialistaId)
            .gte('fecha', fechasStr[0] + 'T00:00:00')
            .lte('fecha', fechasStr[fechasStr.length - 1] + 'T23:59:59')
            .then(({ data: turnos, error: turnosError }) => {
              if (turnosError) {
                console.error('Error obteniendo turnos ocupados:', turnosError.message);
            }

              const horasDisponiblesTemp: Record<string, string[]> = {}; 
              const diasDisponiblesTemp: { fecha: string, textoVisible: string }[] = []; 

              fechasFiltradas.forEach(fecha => { 
                const fechaStr = fecha.toISOString().split('T')[0];
                const nombreDia = this.obtenerNombreDia(fecha).toLowerCase().trim();
                const disp = disponibilidad.find(d => d.dia.toLowerCase().trim() === nombreDia);
                if (!disp) return;

                const ocupados = (turnos || [])
                  .filter(t => {
                    const fechaTurno = new Date(t.fecha);
                    const fechaTurnoStr = fechaTurno.toISOString().split('T')[0];
                    return fechaTurnoStr === fechaStr;
                  })
                  .map(t => {
                    const dt = new Date(t.fecha);
                    const h = dt.getHours().toString().padStart(2, '0');
                    const m = dt.getMinutes().toString().padStart(2, '0');
                    return `${h}:${m}`;
                  });

                const disponibles = this.generarHorarios(disp.hora_inicio, disp.hora_fin, ocupados);

                if (disponibles.length > 0) {
                  diasDisponiblesTemp.push({ 
                    fecha: fechaStr,
                    textoVisible: `${this.obtenerNombreDia(fecha)} (${fecha.toLocaleDateString()})`
                  });
                  horasDisponiblesTemp[fechaStr] = disponibles;
                }
              });
  
              this.diasDisponibles = diasDisponiblesTemp;
              this.horasDisponibles = horasDisponiblesTemp;

              this.diaSeleccionado = '';
              this.horaSeleccionada = '';
              this.cargaDisponibilidad = true;
            });
        });
    }

    generarFechasPosibles() {
      const hoy = new Date();
      this.diasDisponibles = [];

      for (let i = 0; i < 15; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() + i);
        const diaSemana = this.obtenerNombreDia(fecha);

        const visible = this.horasDisponibles[i] ? diaSemana : null;

        if (visible && Object.keys(this.horasDisponibles).length > 0) {
          this.diasDisponibles.push({
            fecha: fecha.toISOString().split('T')[0],
            textoVisible: `${diaSemana} (${fecha.toLocaleDateString()})`
          });
        }
      }
    }

    getHorariosParaDiaSeleccionado(): string[] { 
      return this.horasDisponibles[this.diaSeleccionado] || [];
    }

    obtenerNombreDia(fecha: Date): string {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
      return dias[fecha.getDay()];
    }

    crearTurno() {
      const pacienteId = this.esAdmin() ? this.turno?.paciente_id : this.usuario?.id;

      if (!pacienteId || !this.turno?.especialista_id || !this.turno?.especialidad || !this.diaSeleccionado || !this.horaSeleccionada) {
        console.error('Faltan datos para generar el turno');
        return;
      }

      if (this.captchaHabilitado) {
        const token = (window as any).grecaptcha?.getResponse();
        if (!token) {
          console.error('Por favor completá el captcha.');
          return;
        }
      }

      supabase
        .from('turnos')
        .insert([{
          paciente_id: pacienteId,
          especialista_id: this.turno.especialista_id,
          especialidad: this.turno.especialidad,
          fecha: `${this.diaSeleccionado}T${this.horaSeleccionada}:00`, 
          estado: 'pendiente'
        }])
        .then(({ data, error }) => {
          if (error) {
            console.error('Error al crear turno:', error.message);
            return;
          }
          console.log('Turno creado:', data);
          this.router.navigate(['/home']);
        });
    }

    onEspecialidadChange(nombreEspecialidad: string) {
      this.turno.especialidad = nombreEspecialidad;           
      this.diaSeleccionado = '';                 
      this.horaSeleccionada = '';
      this.resetearCaptcha(); // Resetear captcha cuando cambia la especialidad

      if(this.esAdmin()){
        this.turno.especialista_id = '';
        this.especialistasPorEspecialidad = [];
        this.loadEspecialistasPorEspecialidad(nombreEspecialidad);
        this.diasDisponibles = [];                 
        this.horasDisponibles = {};
      } else {
        // Para pacientes, renderizar captcha cuando se selecciona especialidad
        if (this.captchaHabilitado) {
          setTimeout(() => this.renderizarCaptcha(), 100);
        }
      }
      
    }

    onEspecialistaChange(especialistaId: any) {
      this.turno.especialista_id = especialistaId;
      this.diaSeleccionado = '';                 
      this.horaSeleccionada = '';
      this.resetearCaptcha(); // Resetear captcha cuando cambia el especialista
      this.diasDisponibles = [];                 
      this.horasDisponibles = {};
      
      if (!this.esAdmin()) {
        const especialista = this.especialistas.find(e => e.id === especialistaId);
        if (especialista && especialista.especialidades) {
          this.loadEspecialidadesPorEspecialista(especialista.especialidades);
        }
      }      

      this.loadDisponibilidad(especialistaId);
    }

  onDiaSeleccionadoChange() {
    this.horaSeleccionada = '';
  }


  diaSeleccionadoChange(nuevoDia: string) {
    this.diaSeleccionado = nuevoDia;
    this.horaSeleccionada = ''; 
  }

  onHoraSeleccionadaChange(hora: string) {
    this.horaSeleccionada = hora;
  }

    // genera las proximas n fechas  
    getFechasProximas(n: number): Date[] {
      const fechas = [];
      const hoy = new Date();
      for (let i = 0; i < n; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        fecha.setHours(0,0,0,0);
        fechas.push(fecha);
      }
      return fechas;
    }

    generarHorarios(horaInicio: string, horaFin: string, ocupados: string[]): string[] {
      const horarios: string[] = [];
      let [hora, minuto] = horaInicio.split(':').map(Number);
      const [hFin, mFin] = horaFin.split(':').map(Number);

      while (hora < hFin || (hora === hFin && minuto < mFin)) {
        const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        if (!ocupados.includes(horaStr)) {
          horarios.push(horaStr);
        }
        minuto += 30;
        if (minuto >= 60) {
          hora += 1;
          minuto = 0;
        }
      }

      return horarios;
    }

    getAvatarUrl(avatarUrl: string) {
      return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
    }

    formatoHoraAMPM(hora: string): string {
      const [h, m] = hora.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0);

      const horas12 = date.getHours() % 12 || 12;
      const minutos = date.getMinutes().toString().padStart(2, '0');
      const ampm = date.getHours() >= 12 ? 'PM' : 'AM';

      return `${horas12}:${minutos} ${ampm}`;
    }

}
