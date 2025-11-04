export interface Usuario {
  id?: string;
  created_at?: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  obra_social?: string; // pacientes
  categoria: 'paciente' | 'especialista' | 'administrador';
  url_img1: string;
  url_img2?: string;     // solo pacientes
  especialidades?: string[]; // solo especialistas
  habilitado?: boolean;  // especialistas y admin
  email: string;
}
