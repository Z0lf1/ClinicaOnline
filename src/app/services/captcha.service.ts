import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment.prod';
import { BehaviorSubject, Observable } from 'rxjs';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Injectable({
  providedIn: 'root'
})
export class CaptchaService {
  private captchaHabilitadoSubject = new BehaviorSubject<boolean>(true);
  public captchaHabilitado$: Observable<boolean> = this.captchaHabilitadoSubject.asObservable();

  constructor() {
    this.cargarEstadoCaptcha();
  }

  async cargarEstadoCaptcha(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('captcha_habilitado')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error cargando configuración de captcha:', error.message);
        // Si no existe la configuración, crear una por defecto con captcha habilitado
        await this.crearConfiguracionInicial();
        this.captchaHabilitadoSubject.next(true);
        return;
      }

      if (data) {
        this.captchaHabilitadoSubject.next(data.captcha_habilitado !== false);
      } else {
        // Si no existe, crear configuración inicial
        await this.crearConfiguracionInicial();
        this.captchaHabilitadoSubject.next(true);
      }
    } catch (error) {
      console.error('Error al cargar estado del captcha:', error);
      this.captchaHabilitadoSubject.next(true); // Por defecto habilitado
    }
  }

  async crearConfiguracionInicial(): Promise<void> {
    try {
      const { error } = await supabase
        .from('configuracion')
        .insert([{ id: 1, captcha_habilitado: true }]);

      if (error && error.code !== '23505') { // 23505 = duplicate key
        console.error('Error creando configuración inicial:', error.message);
      }
    } catch (error) {
      console.error('Error al crear configuración inicial:', error);
    }
  }

  async actualizarEstadoCaptcha(habilitado: boolean): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      // Primero intentar hacer un update
      const { error: updateError } = await supabase
        .from('configuracion')
        .update({ captcha_habilitado: habilitado })
        .eq('id', 1);

      // Si el update falla porque no existe el registro, hacer insert
      if (updateError) {
        if (updateError.code === 'PGRST116' || updateError.message.includes('No rows')) {
          // No existe el registro, intentar insert
          const { error: insertError } = await supabase
            .from('configuracion')
            .insert([{ id: 1, captcha_habilitado: habilitado }]);

          if (insertError) {
            // Si el insert también falla, puede ser que la tabla no exista
            console.error('Error insertando configuración:', insertError);
            return { 
              exito: false, 
              mensaje: `La tabla 'configuracion' no existe. Por favor, créala en Supabase con: CREATE TABLE configuracion (id INTEGER PRIMARY KEY DEFAULT 1, captcha_habilitado BOOLEAN DEFAULT true);` 
            };
          }
        } else {
          // Otro tipo de error
          console.error('Error actualizando estado del captcha:', updateError);
          return { 
            exito: false, 
            mensaje: `Error: ${updateError.message || 'Error desconocido'}` 
          };
        }
      }

      this.captchaHabilitadoSubject.next(habilitado);
      return { exito: true };
    } catch (error: any) {
      console.error('Error al actualizar estado del captcha:', error);
      return { 
        exito: false, 
        mensaje: `Error: ${error.message || 'Error desconocido'}` 
      };
    }
  }

  estaHabilitado(): boolean {
    return this.captchaHabilitadoSubject.value;
  }
}

