import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Form } from '@angular/forms';
import { CaptchaService } from '../../services/captcha.service';
import { Subscription } from 'rxjs';


const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.scss'
})
export class DisponibilidadComponent implements OnInit, AfterViewInit, OnDestroy {

  usuarioId: string = '';
  diasDeSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes','Sabado'];
  disponibilidadEditable: { dia: string, hora_inicio: string, hora_fin: string }[] = [];

  horariosPorDia: { [key: string]: string[] } = {};
  mensaje: string = '';
  mensajeError: string = '';
  duracionTurno: number = 30; // Duración fija de los turnos en minutos

  captchaCompletado: boolean = false;
  captchaHabilitado: boolean = true;
  private captchaSubscription?: Subscription;

  constructor(
    private router: Router,
    private captchaService: CaptchaService
  ) {}

  ngOnInit() {
    this.generarHorarios();
    
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
    
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;

      this.usuarioId = data.user.id;

      supabase.from('disponibilidad').select('*').eq('especialista_id', this.usuarioId).then(({ data }) => {
        if (!data || data.length === 0) {
          this.disponibilidadEditable = this.diasDeSemana.map(dia => ({
            dia, hora_inicio: '', hora_fin: ''
          }));
        } else {
          this.disponibilidadEditable = this.diasDeSemana.map(dia => {
            const existente = data.find(d => d.dia === dia);
            return {
              dia,
              hora_inicio: existente?.hora_inicio || '',
              hora_fin: existente?.hora_fin || ''
            };
          });
        }
      });
    });

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
      const captchaDiv = document.getElementById('captcha-disponibilidad');
      
      if (captchaDiv && (window as any).grecaptcha) {
        if (!captchaDiv.hasChildNodes()) {
          try {
            (window as any).grecaptcha.render('captcha-disponibilidad', {
              'sitekey': '6Le9HA4sAAAAABU7Wg6hc1Vlznz-vuPxySrg-CLB',
              'callback': () => this.onCaptchaResolved()
            });
          } catch (e) {
            console.error('Error renderizando captcha:', e);
          }
        }
        if (captchaDiv.hasChildNodes() && captchaDiv.offsetParent !== null) {
          clearInterval(checkInterval);
        }
      }
    }, 500);
    
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  onCaptchaResolved() {
    this.captchaCompletado = true;
  }

  guardarDisponibilidad() {
    this.mensajeError = '';

    if (this.captchaHabilitado) {
      const token = (window as any).grecaptcha?.getResponse();
      if (!token) {
        this.mensajeError = 'Por favor completá el captcha.';
        return;
      }
    } 

    for (const d of this.disponibilidadEditable) {
      if ((d.hora_inicio && !d.hora_fin) || (!d.hora_inicio && d.hora_fin)) {
        this.mensajeError = `Debe completar ambos campos para el día o dejarlos vacíos.`;
        return;
      }

      if (d.hora_inicio && d.hora_fin && d.hora_inicio >= d.hora_fin) {
        this.mensajeError = `La hora de inicio debe ser menor a la hora de fin.`;
        return;
      }
    }

    const updates = this.disponibilidadEditable.map(d => ({
      especialista_id: this.usuarioId,
      dia: d.dia,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin
    }));

    updates.forEach((item, index) => {
        supabase
          .from('disponibilidad')
          .select('id')
          .eq('especialista_id', item.especialista_id)
          .eq('dia', item.dia)
          .then(({ data, error }) => {
            if (error) {
              console.error(`Error consultando disponibilidad para ${item.dia}:`, error.message);
              return;
            }

            if (data && data.length > 0) {
              // Hacemos update
              supabase
                .from('disponibilidad')
                .update({ hora_inicio: item.hora_inicio, hora_fin: item.hora_fin })
                .eq('especialista_id', item.especialista_id)
                .eq('dia', item.dia)
                .then(({ error: updateError }) => {
                  if (updateError) {
                    console.error(`Error actualizando disponibilidad para ${item.dia}:`, updateError.message);
                  }
                  if (index === updates.length - 1) {
                    this.mensaje = 'Disponibilidad actualizada.';
                    this.router.navigate(['/home/perfil']);
                  }
                });
            } else {
              // Hacemos insert
              supabase
                .from('disponibilidad')
                .insert(item)
                .then(({ error: insertError }) => {
                  if (insertError) {
                    console.error(`Error insertando disponibilidad para ${item.dia}:`, insertError.message);
                  }
                  if (index === updates.length - 1) {
                    this.mensaje = 'Disponibilidad actualizada.';
                    this.router.navigate(['/home/perfil']);
                  }
                });
            }
          });
    });
  }

//   generarHorarios() {
//   this.horariosPorDia = {};

//   for (let i = 0; i < this.diasDeSemana.length; i++) {
//     const dia = this.diasDeSemana[i];
//     const horarios = [];
//     const limite = (dia === 'Sabado') ? 14 : 19;

//     for (let hora = 8; hora <= limite; hora++) {
//       const h = hora < 10 ? '0' + hora : '' + hora;

//       horarios[horarios.length] = h + ':00';
//       if (hora < limite) {
//         horarios[horarios.length] = h + ':30';
//       }
//     }

//     this.horariosPorDia[dia] = horarios;
//   }
// }
generarHorarios() {
  this.horariosPorDia = {};

  const duracion = Number(this.duracionTurno) || 30;

  for (const dia of this.diasDeSemana) {
    const horarios: string[] = [];

    const inicioMinutos = 8 * 60; // 08:00
    const finMinutos = Math.floor((dia.toLowerCase() === 'Sabado' ? 14.5 : 19.5) * 60); // 14:30 o 19:30 exactos

    for (let minutos = inicioMinutos; minutos <= finMinutos; minutos += duracion) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      const horaStr = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      horarios.push(horaStr);
    }

      this.horariosPorDia[dia] = horarios;
  }

  console.log('Duración de turno:', duracion, 'horarios generados:', this.horariosPorDia);
}


filtrarHorariosFin(dia: string, horaInicio: string): string[] {
  const todos = this.horariosPorDia[dia] || [];
  if (!horaInicio) return todos; // si no hay inicio, mostrar todos
  const indiceInicio = todos.indexOf(horaInicio);
  return todos.slice(indiceInicio + 1); // solo los que vienen después
}


}
