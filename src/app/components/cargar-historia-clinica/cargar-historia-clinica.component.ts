import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Turno } from '../../models/turnos';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoriaClinica } from '../../models/historia-clinica';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);



@Component({
  selector: 'app-cargar-historia-clinica',
  imports: [CommonModule,FormsModule],
  templateUrl: './cargar-historia-clinica.component.html',
  styleUrl: './cargar-historia-clinica.component.scss'
})
export class CargarHistoriaClinicaComponent implements OnInit {

  turno: Turno | null = null;
  historiaClinica: HistoriaClinica = {
    id: '',
    paciente_id: '',
    especialista_id: '',
    turno_id: 0,
    altura: 0,
    peso: 0,
    temperatura: 0,
    presion: '',
    datos_dinamicos: {},
    created_at: ''
  }

  datosDinamicosTemp: { clave: string; valor: string }[] = [];
  msg: string = '';
  errorMsg:string = '';

  constructor(private route:ActivatedRoute,private router:Router){}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const turnoId = params['turnoId'];
      if (turnoId) {
        supabase
        .from('turnos')
        .select('*')
        .eq('id',turnoId)
        .then(({data,error}) =>{
          if(error){
            console.error('Error al cargar turno',error.message);
            return;
          }

          console.log('Turno recibido',data);
          this.turno = data[0];

        })
      }
    });
  }

  crearHistoriaClinicaPaciente(){
    if (!this.turno) {
      console.error('No hay turno cargado.');
      return;
    }

    if (
      !this.historiaClinica.altura ||
      !this.historiaClinica.peso ||
      !this.historiaClinica.temperatura ||
      !this.historiaClinica.presion
    ) {
      console.error('Faltan datos fijos de la historia clínica.');
      return;
    }

    const datosDinamicos: Record<string, string> = {};
    this.datosDinamicosTemp.forEach((dato) => {
      if (dato.clave && dato.valor) {
        datosDinamicos[dato.clave] = dato.valor;
      }
    });

    this.historiaClinica = {
      paciente_id: this.turno.paciente_id,
      especialista_id: this.turno.especialista_id,
      turno_id: this.turno.id,
      altura: this.historiaClinica.altura,
      peso: this.historiaClinica.peso,
      temperatura: this.historiaClinica.temperatura,
      presion: this.historiaClinica.presion,
      datos_dinamicos: datosDinamicos
    };

    // Insertar en Supabase
    supabase
      .from('historias-clinicas')
      .insert(this.historiaClinica)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al guardar historia clínica:', error.message);
          return;
        }

        console.log('Historia clínica guardada:', data);
        this.msg ='Historia clínica cargada correctamente';

        supabase
          .from('turnos')
          .update({historia_clinica : true})
          .eq('id',this.turno?.id)
          .then(({data,error})=>{
            if(error){
              console.error('Error al actualizar estado de historia clinica',console.error);
              return;
            }

          })

          console.log('Historia clínica guardada:', data);
          this.router.navigate(['home/mis-turnos']);
      });  


  }

  agregarDatoDinamico() {
    if (this.datosDinamicosTemp.length < 3) {
      this.datosDinamicosTemp.push({ clave: '', valor: '' });
    }
  }

  eliminarDatoDinamico(index: number) {
    this.datosDinamicosTemp.splice(index, 1);
  }
}
