import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Usuario } from '../../models/usuario';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CaptchaService } from '../../services/captcha.service';
import { Subscription } from 'rxjs';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-agregar-especialidad',
  imports: [CommonModule,FormsModule],
  templateUrl: './agregar-especialidad.component.html',
  styleUrl: './agregar-especialidad.component.scss'
})
export class AgregarEspecialidadComponent implements OnInit, AfterViewInit, OnDestroy{

  usuario:Usuario | null = null;
  idsEspecialidadesUsuario: string[] = [];
  especialidadesDisponibles: any[] = [];
  especialidadSeleccionada: string = '';

  msg: string = '';
  errorMsg: string = '';

  captchaCompletado: boolean = false;
  captchaHabilitado: boolean = true;
  private captchaSubscription?: Subscription;

  constructor(
    private router:Router,
    private captchaService: CaptchaService
  ){}

  ngOnInit(): void {
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
      const captchaDiv = document.getElementById('captcha-especialidad');
      
      if (captchaDiv && (window as any).grecaptcha) {
        if (!captchaDiv.hasChildNodes()) {
          try {
            (window as any).grecaptcha.render('captcha-especialidad', {
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

    if (this.captchaHabilitado) {
      const token = (window as any).grecaptcha?.getResponse();
      if (!token) {
        this.errorMsg = 'Por favor completá el captcha.';
        return;
      }
    }

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
