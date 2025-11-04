import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Usuario } from '../../models/usuario';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

@Component({
  selector: 'app-generar-usuario',
  imports: [CommonModule,FormsModule,RouterLink],
  templateUrl: './generar-usuario.component.html',
  styleUrl: './generar-usuario.component.scss'
})
export class GenerarUsuarioComponent implements OnInit{

    
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

  especialidadesDisponibles: { id: string; nombre: string }[] = [];
  especialidadesSeleccionadas: any[] = [];
  especialidadSeleccionada: string = '';
  
  password: string = '';
  avatarFile: File | null = null;
  avatarFile2: File | null = null;

  msg = '';
  errorMsg = '';
  submitted = false;

  nuevaEspecialidad: string = '';


  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadEspecialidades();
  }

  registrar() {
    this.submitted = true;
    this.errorMsg = '';

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
          .insert(nuevasEspecialidades.map(nombre => ({ nombre, habilitado: true })))
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

  continuarRegistro(u: Usuario) {
    supabase.auth.signUp({
      email: u.email,
      password: this.password,
    }).then(({ data, error }) => {
      if (error) {
        console.error(error.message);
        this.errorMsg = 'Error al registrarse: ' + error.message;
      } else {
        console.log('usuario registrado con éxito', data.user);
        this.saveUserData(data.user);
      }
    });
  }

  saveUserData(user: any) {
    if (!user) {
      this.errorMsg = 'Error interno: usuario no válido.';
      return;
    }

    this.saveFile().then((data1) => {
      if (data1) {
        this.usuario.url_img1 = data1.path;

        if (this.usuario.categoria === 'paciente' && this.avatarFile2) {
          const original = this.avatarFile;
          this.avatarFile = this.avatarFile2;

          this.saveFile().then((data2) => {
            if (data2) {
              this.usuario.url_img2 = data2.path;
            }

            this.avatarFile = original;

            this.insertUser(user);
          });
        } else {
          this.insertUser(user);
        }
      }
    });
  }

  insertUser(user: Usuario) {
    supabase.from('usuariosclinica').insert([
      {
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
      }
    ]).then(({ data, error }) => {
      if (error) {
        console.error('Error:', error.message);
      } else {
        this.msg = '¡Usuario creado con exito!';
        this.usuario = {
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
          email: ''
        };

        this.password = '';
        this.avatarFile = null;
        this.avatarFile2 = null;
        this.nuevaEspecialidad = '';
        this.especialidadSeleccionada = '';
        this.submitted = false;
      }
    });
  }  

  async saveFile() {
  const nombreArchivo= `${Date.now()}_${this.avatarFile?.name}`;
  const { data, error } = await supabase
    .storage
    .from('fotoUsuarios')
    .upload(nombreArchivo, this.avatarFile!, {
      cacheControl: '3600',
      upsert: false
    });

    return data;
  }

  onFileSelected(event: any) {
    this.avatarFile = event.target.files[0];
  }
  
  onFileSelected2(event: any) {
    this.avatarFile2 = event.target.files[0];
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

  loadEspecialidades() {
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
}



