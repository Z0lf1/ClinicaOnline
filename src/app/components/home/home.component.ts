import { Component, OnInit } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Usuario } from '../../models/usuario';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { trigger, transition, style, animate, query, animateChild, group, state, keyframes } from '@angular/animations';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-home',
  imports: [RouterOutlet, CommonModule,RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations:[
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
          })
        ], { optional: true }),
        query(':enter', [
          style({ top: '100%', opacity: 0 })
        ], { optional: true }),
        query(':leave', animateChild(), { optional: true }),
        group([
          query(':leave', [
            animate('3000ms ease-out', style({ top: '100%', opacity: 0 }))
          ], { optional: true }),
          query(':enter', [
            animate('1500ms ease-out', style({ top: '0%', opacity: 1 }))
          ], { optional: true })
        ]),
        query(':enter', animateChild(), { optional: true }),
      ])
    ])
  ]
})

export class HomeComponent implements OnInit{

  rutaActual: string = '';
  usuario: Usuario | null = null;

  constructor(private router : Router){}

  ngOnInit() {
    this.rutaActual = this.router.url;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.rutaActual = event.url;
    });
  
    this.getUserData();
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }


  getUserData(){
    console.log('Obteniendo datos del usuario...');
    supabase.auth.getUser().then(({data,error}) => {
      if(error){
        console.error('Error al obtener usuario autenticado:', error.message);
        return;
      }        
      if (!data.user) {
        console.error('No hay usuario autenticado');
        this.router.navigate(['/login']);
        return;
      }
      const userId = data.user.id;
      console.log('ID del usuario autenticado:', userId);
      
      supabase.from('usuariosclinica').select('*').eq('id',userId).single().then(({data,error}) => {
        if(error){
          console.error('Error al obtener datos del usuario:', error.message);
          return;
        }  
        if (!data) {
          console.error('No se encontraron datos para el usuario');
          return;
        }
        this.usuario = data; 
      })
      
    });
  }

  getAvatarUrl(avatarUrl: string) {
    return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
  }

  

  logout(){
    supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  cuentaHabilitada(): boolean {
    if (this.usuario?.categoria === 'administrador' || this.usuario?.categoria === 'paciente') {
      return true;
    }
    return this.usuario?.habilitado === true;
  }

  esAdmin(): boolean {
    return this.usuario?.categoria === 'administrador';
  }

  esEspecialista(): boolean {
    return this.usuario?.categoria === 'especialista';
  }

  esPaciente(): boolean {
    return this.usuario?.categoria === 'paciente';
  }

  mostrarDatos(): boolean {
    const url = this.router.url;
    return url === '/home';
  }
  
}
