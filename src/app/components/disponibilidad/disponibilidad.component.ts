import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Form } from '@angular/forms';


const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.scss'
})
export class DisponibilidadComponent {

  usuarioId: string = '';
  diasDeSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes','Sabado'];
  disponibilidadEditable: { dia: string, hora_inicio: string, hora_fin: string }[] = [];

  horariosPorDia: { [key: string]: string[] } = {};
  mensaje: string = '';
  mensajeError: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
        
    this.generarHorarios();
    
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

  guardarDisponibilidad() {
    this.mensajeError = ''; 

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

  generarHorarios() {
  this.horariosPorDia = {};

  for (let i = 0; i < this.diasDeSemana.length; i++) {
    const dia = this.diasDeSemana[i];
    const horarios = [];
    const limite = (dia === 'Sabado') ? 14 : 19;

    for (let hora = 8; hora <= limite; hora++) {
      const h = hora < 10 ? '0' + hora : '' + hora;

      horarios[horarios.length] = h + ':00';
      if (hora < limite) {
        horarios[horarios.length] = h + ':30';
      }
    }

    this.horariosPorDia[dia] = horarios;
  }
}


}
