import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router,RouterModule } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
// Usar el env de desarrollo durante el serve local. Si quieres apuntar al proyecto de producción,
// actualiza `src/environments/environment.prod.ts` en lugar de importar directamente el archivo prod.
import { environment } from '../../../environments/environment';
import { Usuario } from '../../models/usuario';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, animateChild, group, state, keyframes } from '@angular/animations';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  standalone:true,
  imports: [FormsModule,CommonModule,RouterModule],
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations:[
    trigger('tipoSeleccionado', [
      state('visible', style({
        transform: 'scale(1)',
        position: 'static',
        width: '*',
        height: '*',
        opacity: 1,
        zIndex: 1
      })),
      state('izquierda', style({
        transform: 'scale(4)', 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        opacity: 0,
        zIndex: 10
      })),
      state('derecha', style({
        transform: 'scale(4)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        opacity: 0,
        zIndex: 10
      })),
      transition('visible => izquierda', [
        animate('1200ms cubic-bezier(0.25, 0.1, 0.25, 1)')
      ]),
      transition('visible => derecha', [
        animate('1200ms cubic-bezier(0.25, 0.1, 0.25, 1)')
      ])
    ])
  
  ]
})
export class RegisterComponent implements OnInit, AfterViewInit{

  usuario: Usuario = {
      nombre: '',
      apellido: '',
      edad: 0,
      dni: '',
      obra_social: '',
      categoria: 'paciente',
      url_img1: '',
      url_img2: '',
      especialidades: [],
      habilitado: true,
      email:''
  };

  especialidadesDisponibles: {id:string; nombre:string}[] = [];
  especialidadSeleccionada: string = '';
  especialidadesSeleccionadas: string[] = [];
  
  password: string = '';
  avatarFile: File | null = null;
  avatarFile2: File | null = null;

  errorMsg = '';
  submitted = false;

  nuevaEspecialidad: string = '';

  tipoSeleccionado: boolean = false;
  animacionTipo: 'visible' | 'izquierda' | 'derecha' = 'visible';
  

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadEspecialidades();    
  }

  ngAfterViewInit() {
    const checkInterval = setInterval(() => {
      const captchaDiv = document.getElementById('captcha');
      if (captchaDiv && (window as any).grecaptcha) {
        (window as any).grecaptcha.render('captcha', {
          'sitekey': '6Le9lgIsAAAAAEn6rwSbUACf59ywqxHfdl98zkKf'
        });
        clearInterval(checkInterval);
      }
    }, 500);
  }

  registrar() {
    this.submitted = true;
    this.errorMsg = '';

    const token = (window as any).grecaptcha.getResponse();
    if (!token) {
      this.errorMsg = 'Por favor completá el captcha.';
      return;
    }



    const u = this.usuario;

    // para pacientes y datos comunes
    if (!u.email || !this.password || !u.nombre || !u.apellido || !u.dni || !u.edad || !this.avatarFile || !u.obra_social || (u.categoria === 'paciente' && !this.avatarFile2)) {
      this.errorMsg = 'Por favor completá todos los campos obligatorios.';
      return;
    }

    //verificar q haya al menos una especialidad
    if (u.categoria === 'especialista' && this.especialidadesSeleccionadas.length === 0) {
      this.errorMsg = 'Debés seleccionar al menos una especialidad.';
      return;
    }

    //para especialistas y agregar especialidad
    if (u.categoria === 'especialista') {
      this.loadEspecialidades();

      const idsExistentes: string[] = [];
      const nuevasEspecialidades: string[] = [];

      //Separamos las especialidades q agrega el usuario de las que ya existen
      this.especialidadesSeleccionadas.forEach(nombre => {
        const encontrada = this.especialidadesDisponibles.find(e => e.nombre.toLowerCase() === nombre.toLowerCase());
        if (encontrada) {
          idsExistentes.push(encontrada.id);
        } else {
          nuevasEspecialidades.push(nombre);
        }
      });

      if (nuevasEspecialidades.length === 0) {
        // No agrego especialidades
        u.especialidades = idsExistentes;
        this.continuarRegistro(u);
      } else {
        // agrego al menos una especialidad
        supabase
          .from('especialidades')
          .insert(nuevasEspecialidades.map(nombre => ({ nombre, habilitado: false })))
          .select('id')
          .then(({ data, error }) => {
            if (error) {
              console.error('Error agregando nuevas especialidades:', error.message);
              this.errorMsg = 'Error agregando especialidades. Intente luego.';
              return;
            }
            const nuevosIds = data ? data.map(e => e.id) : [];
            u.especialidades = idsExistentes.concat(nuevosIds);
            this.continuarRegistro(u);
          });
      }

    } else {
      // no es especialista
      this.continuarRegistro(u);
    }
  }

  async continuarRegistro(u: Usuario) {
    console.log('%c Iniciando registro de usuario...', 'background: #222; color: #bada55');
    console.log('Email:', u.email);
    
    // Prueba de conexión a Supabase
    console.log('Probando conexión a Supabase...');
    try {
      const tables = await supabase
        .from('usuariosclinica')
        .select('id')
        .limit(1);
      console.log('Prueba de conexión resultado:', tables);
    } catch (err) {
      console.error('Error en prueba de conexión:', err);
    }

    try {
      console.log('Intentando registro en Auth...');
      const { data, error } = await supabase.auth.signUp({
        email: u.email,
        password: this.password,
    options: { emailRedirectTo: 'http://localhost:4200/login' }///CAMBIAR URL DE REDIRECCION

      });

      if (error) {
        console.error('Error en signUp:', error);
        this.errorMsg = 'Error al registrarse: ' + error.message;
        return;
      }

      if (!data.user) {
        console.error('No se recibió usuario después del registro');
        this.errorMsg = 'Error: No se pudo crear el usuario';
        return;
      }

      console.log('%c Auth exitoso! Usuario:', 'background: #222; color: #bada55', data.user);
      alert('Usuario autenticado correctamente. Procediendo a guardar datos...');
      
      try {
        console.log('Iniciando guardado de datos...');
        await this.saveUserData(data.user);
        console.log('Datos guardados exitosamente');
      } catch (error: any) {
        console.error('Error en saveUserData:', error);
        this.errorMsg = 'Error al guardar datos del usuario: ' + (error.message || 'Error desconocido');
        alert('Error al guardar datos: ' + (error.message || 'Error desconocido'));
        
        try {
          console.log('Limpiando sesión debido al error...');
          await supabase.auth.signOut();
        } catch (cleanupError) {
          console.error('Error al limpiar sesión:', cleanupError);
        }
      }
    } catch (error: any) {
      console.error('Error general en continuarRegistro:', error);
      this.errorMsg = 'Error inesperado: ' + (error.message || 'Error desconocido');
      alert('Error inesperado: ' + (error.message || 'Error desconocido'));
    }
  }

  async saveUserData(user: any) {
    console.log('Iniciando saveUserData con usuario:', user);
    
    if (!user) {
      console.error('Error: usuario no válido en saveUserData');
      this.errorMsg = 'Error interno: usuario no válido.';
      return;
    }

    try {
      console.log('Guardando primer archivo...');
      const data1 = await this.saveFile();
      
      if (!data1) {
        console.error('Error: No se pudo guardar el primer archivo');
        return;
      }
      
      console.log('Primer archivo guardado:', data1);
      this.usuario.url_img1 = data1.path;

      if (this.usuario.categoria === 'paciente' && this.avatarFile2) {
        console.log('Usuario es paciente, guardando segundo archivo...');
        const original = this.avatarFile;
        this.avatarFile = this.avatarFile2;

        try {
          const data2 = await this.saveFile();
          if (data2) {
            console.log('Segundo archivo guardado:', data2);
            this.usuario.url_img2 = data2.path;
          }
        } catch (error) {
          console.error('Error al guardar segundo archivo:', error);
        } finally {
          this.avatarFile = original;
        }
      }

      console.log('Procediendo a insertar usuario en la base de datos...');
      await this.insertUser(user);
      
    } catch (error) {
      console.error('Error en saveUserData:', error);
      this.errorMsg = 'Error al guardar los datos del usuario.';
    }
  }

  async insertUser(user: any) {
    console.log('%c Iniciando insertUser...', 'background: #222; color: #bada55');
    console.dir(user);

    if(this.usuario.categoria === 'especialista'){
      this.usuario.habilitado = false;
    }

    const userData = {
      id: user.id,
      nombre: this.usuario.nombre,
      apellido: this.usuario.apellido,
      edad: this.usuario.edad,
      dni: this.usuario.dni,
      obra_social: this.usuario.obra_social,
      categoria: this.usuario.categoria,
      especialidades: this.usuario.especialidades,
      habilitado: this.usuario.habilitado,
      url_img1: this.usuario.url_img1,
      url_img2: this.usuario.url_img2,
      email: this.usuario.email
    };

    console.log('%c Datos a insertar:', 'background: #222; color: #bada55');
    console.dir(userData);

    try {
      // Prueba directa de la tabla
      console.log('Verificando tabla...');
      const testQuery = await supabase
        .from('usuariosclinica')
        .select('count')
        .limit(1);
      
      console.log('Resultado de prueba de tabla:', testQuery);

      if (testQuery.error) {
        throw new Error('Error al acceder a la tabla: ' + testQuery.error.message);
      }

      // Intento de inserción
      console.log('Intentando inserción...');
      const result = await supabase
        .from('usuariosclinica')
        .insert(userData)
        .select();

      console.log('Resultado de inserción:', result);

      if (result.error) {
        throw result.error;
      }

      alert('Usuario registrado exitosamente!');
      this.router.navigate(['/login']);

    } catch (error: any) {
      console.error('Error en insertUser:', error);
      console.log('Error completo:', error);
      alert('Error al insertar usuario: ' + (error.message || 'Error desconocido'));
      throw error;
    }
  }  

  async saveFile() {
  const nombreArchivo = `${Date.now()}_${this.avatarFile?.name}`;
  const { data, error } = await supabase
    .storage
    .from('fotoUsuarios')
    .upload(nombreArchivo, this.avatarFile!, {
      cacheControl: '3600',
      upsert: false,
      contentType: this.avatarFile!.type
    });

    console.log(error);

    return data;
  }

  onFileSelected(event: any) {
    this.avatarFile = event.target.files[0];
  }
  
  onFileSelected2(event: any) {
    this.avatarFile2 = event.target.files[0];
  }

  EspecialidadChange() {
    if (this.especialidadSeleccionada !== 'Otro') {
      this.usuario.especialidades = [this.especialidadSeleccionada];
    } else {
      this.usuario.especialidades = [];
    }
  }

  loadEspecialidades(){
    supabase
      .from('especialidades')
      .select('id, nombre')
      .eq('habilitado', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando especialidades:', error.message);
          return;
        }
        this.especialidadesDisponibles = data || [];
      });    
  }

  seleccionarTipo(tipo: 'paciente' | 'especialista') {
    this.usuario.categoria = tipo;
    this.animacionTipo = tipo === 'paciente' ? 'izquierda' : 'derecha';

    setTimeout(() => {
      this.tipoSeleccionado = true;
    }, 300);
  }

  obtenerNombreEspecialidad(id: string): string {
    const especialidad = this.especialidadesDisponibles.find(e => e.id === id);
    return especialidad ? especialidad.nombre : 'Especialidad desconocida';
  }

  agregarEspecialidad() {
    const nombre = this.especialidadSeleccionada.trim();

    if (!nombre) return;

    if (!this.especialidadesSeleccionadas.includes(nombre)) {
      this.especialidadesSeleccionadas.push(nombre);
    }

    this.especialidadSeleccionada = '';
  }


  eliminarEspecialidad(nombre: string) {
    this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(
      esp => esp !== nombre
    );
  }

}
