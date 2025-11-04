export interface HistoriaClinica {
  id?: string;
  paciente_id: string;
  especialista_id: string;
  turno_id: number;
  altura: number;
  peso: number;
  temperatura: number;
  presion: string;
  datos_dinamicos: Record<string, string>;
  created_at?: string;
}
