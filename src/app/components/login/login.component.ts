import { Component, OnInit } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.prod';
import { FormsModule } from '@angular/forms';
import { RouterLink,Router } from '@angular/router';
import { CommonModule } from '@angular/common';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-login',
  imports: [FormsModule,RouterLink,CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{

  mail: string = "";
  password: string = "";

  submitted: boolean = false;
  incorrect: boolean = false;
  errorMsg : string = '';


  usuarios: any[] = [];

  constructor(private router : Router){}
  
  ngOnInit(): void {
    this.loadUsersFastAcces();
  }
  
  login(){
    this.submitted = true;
    this.errorMsg = '';
    
    if(this.mail.length == 0 ||
      this.password.length == 0)
    {
      this.errorMsg = 'Credenciales incorrectas';  
      return;
    }
    supabase.auth.signInWithPassword({
      email: this.mail,
      password: this.password,
    }).then(({data, error}) => {
      if(error){
        this.incorrect = true;
        if (error.message === 'Email not confirmed'){
          this.errorMsg = 'Verifica tu email para poder iniciar sesion'; 
        }else{
          this.errorMsg = 'Credenciales incorrectas';  
        }
        console.error('Error:', error.message)
      }else{
        const userId = data.user.id;

        supabase
        .from('usuariosclinica')
        .select('habilitado')
        .eq('email', this.mail)
        .single()
        .then(({ data, error}) => {
          if(error) {
            console.error('Error verificando usuario habilitado:', error.message);
            this.errorMsg = 'Error interno, intente más tarde';
            return;
          }

          if(!data.habilitado) {
            this.errorMsg = 'Tu cuenta aún no ha sido habilitada por un administrador';
            supabase.auth.signOut(); //cierro sesion inmediatamente, ya que inicia sesion si el email esta confirmado y las credenciales son correctas
            return;
          }

          supabase
            .from('logs-usuarios')
            .insert([
              {
                usuario_id: userId,
                fecha_hora: new Date().toISOString()
              }
            ]).then(({data,error}) =>{
              if(error){
                console.error('Error al registrar log del usuario', error.message);
              }else{
                console.log('Log de usuario registrado');
              }

              this.router.navigate(['home']);
            });
        });
      }
    });
  }

  getAvatarUrl(avatarUrl: string) {
    return supabase.storage.from('fotoUsuarios').getPublicUrl(avatarUrl).data.publicUrl;
  }

  loadUsersFastAcces(){
    supabase
      .from('usuariosclinica')
      .select('email, url_img1, categoria')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando accesos rápidos:', error.message);
          return;
        }

        const pacientes = data.filter(u => u.categoria === 'paciente').slice(0, 3);
        const especialistas = data.filter(u => u.categoria === 'especialista').slice(0, 2);
        const admins = data.filter(u => u.categoria === 'administrador').slice(0, 1);

        this.usuarios = [...pacientes, ...especialistas, ...admins].map(user => ({
          email: user.email,
          avatar: this.getAvatarUrl(user.url_img1)
            ? this.getAvatarUrl(user.url_img1)
            : 'assets/default-avatar.png',
          categoria: user.categoria
        }));
      });
  }

  completarEmail(user: any){ 
    this.mail = user.email;
    this.password = '123456';
  }
}
