import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { ViewChild } from '@angular/core';
import { TurnosComponent } from '../turnos/turnos.component';
import { CommonModule } from '@angular/common';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ChartOptions } from 'chart.js';


const supabase = createClient(environment.apiUrl, environment.publicAnonKey);


@Component({
  standalone: true,
  selector: 'app-informes',
  imports: [NgChartsModule,CommonModule],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.scss'
})
export class InformesComponent implements OnInit {

  @ViewChild(BaseChartDirective, {static:false}) pieChart!: BaseChartDirective;
  @ViewChild('pieChartDia', { static: false }) pieChartTurnosPorDia!: BaseChartDirective;

  mostrar: boolean = false;

  pieChartLabels: string[] = [];
  pieChartData: number[] = [];
    pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };

  pieChartTurnosPorDiaLabels: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  pieChartTurnosPorDiaData: number[] = [0, 0, 0, 0, 0, 0];
  pieChartTurnosPorDiaOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        enabled: true,
      }
    }
  };


  usuario: Usuario | null = null;
  
  turnosPorEspecialidad: { especialidad: string, count: number }[] = [];
  turnosPorDia: { dia: string, count: number }[] = [];
  turnosSolicitadosPorMedico: {
    especialista_id: string;
    nombre: string;
    apellido: string;
    count: number;
  }[] = [];
  turnosFinalizadosPorMedico: {
    especialista_id: string;
    nombre: string;
    apellido: string;
    count: number;
  }[] = [];
  logIngresos: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    fecha: string;
    hora: string;
  }[] = [];

constructor(private router: Router){}
  
  ngOnInit(): void {
    this.getUserData();
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
  
        this.loadTurnosPorDia();
        this.loadTurnosFinalizadosPorMedico();
        this.loadTurnosPorEspecialidad();
        this.loadTurnosSolicitadosPorMedico();
        this.loadLogIngresos();

      });
    });
  }

  loadTurnosPorDia() {
    supabase.from('turnos')
      .select('fecha')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar turnos por día:', error.message);
          return;
        }

        const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Inicializo el conteo con 0 para cada día válido
        const conteo: Record<string, number> = {
          'Lunes': 0,
          'Martes': 0,
          'Miércoles': 0,
          'Jueves': 0,
          'Viernes': 0,
          'Sábado': 0,
        };

        if (data) {
          data.forEach((turno: any) => {
            const fecha = new Date(turno.fecha);
            const diaSemana = diasValidos[fecha.getDay() - 1]; // getDay(): 0=Domingo, 1=Lunes...

            // Solo incremento si diaSemana es válido y existe en conteo
            if (diasValidos.includes(diaSemana)) {
              conteo[diaSemana]++;
            }
          });
        }

        // Finalmente, asigno los datos a las variables que usás en el gráfico
        this.pieChartTurnosPorDiaLabels = diasValidos;
        this.pieChartTurnosPorDiaData = diasValidos.map(dia => conteo[dia]);

        this.pieChartTurnosPorDia?.update();
      });
  }

  loadTurnosPorEspecialidad() {
    supabase.from('turnos')
      .select('especialidad')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error en turnos por especialidad:', error.message);
          return;
        }

        const conteo: { especialidad: string, count: number }[] = [];

        if (data) {
          data.forEach((turno: any) => {
            const especialidad = turno.especialidad;
            const existente = conteo.find(item => item.especialidad === especialidad);
            if (existente) {
              existente.count++;
            } else {
              conteo.push({ especialidad, count: 1 });
            }
          });
        }

        this.turnosPorEspecialidad = conteo;

        this.pieChartLabels = this.turnosPorEspecialidad.map(item => item.especialidad);
        this.pieChartData = this.turnosPorEspecialidad.map(item => item.count);

        this.pieChart?.update();
      });
  }

  loadTurnosSolicitadosPorMedico() {
  supabase.from('turnos')
    .select('especialista_id, especialista(nombre, apellido)')
    .then(({ data, error }) => {
      if (error) {
        console.error('Error en turnos solicitados por médico:', error.message);
        return;
      }

      const conteo: { especialista_id: string, nombre: string, apellido: string, count: number }[] = [];

      if (data) {
        data.forEach((turno: any) => {
          const id = turno.especialista_id;
          const nombre = turno.especialista?.nombre || 'Desconocido';
          const apellido = turno.especialista?.apellido || '';

          const existente = conteo.find(item => item.especialista_id === id);
          if (existente) {
            existente.count++;
          } else {
            conteo.push({ especialista_id: id, nombre, apellido, count: 1 });
          }
        });
      }

      this.turnosSolicitadosPorMedico = conteo;
    });
  }

  loadTurnosFinalizadosPorMedico() {
  supabase.from('turnos')
    .select('especialista_id, estado, especialista(nombre, apellido)')
    .then(({ data, error }) => {
      if (error) {
        console.error('Error en turnos finalizados por médico:', error.message);
        return;
      }

      const conteo: { especialista_id: string, nombre: string, apellido: string, count: number }[] = [];

      if (data) {
        data.forEach((turno: any) => {
          if (turno.estado === 'finalizado') {
            const id = turno.especialista_id;
            const nombre = turno.especialista?.nombre || 'Desconocido';
            const apellido = turno.especialista?.apellido || '';

            const existente = conteo.find(item => item.especialista_id === id);
            if (existente) {
              existente.count++;
            } else {
              conteo.push({ especialista_id: id, nombre, apellido, count: 1 });
            }
          }
        });
      }

      this.turnosFinalizadosPorMedico = conteo;
    });
  }  

  loadLogIngresos() {
    supabase
      .from('logs-usuarios')
      .select('fecha_hora, usuario(id, nombre, apellido, email)')
      .order('fecha_hora', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar logs de ingreso:', error.message);
          return;
        }

        const logs: {
          id: string;
          nombre: string;
          apellido: string;
          email: string;
          fecha: string;
          hora: string;
        }[] = [];

        if (data) {
          data.forEach((log: any) => {
            const fechaUTC = new Date(log.fecha_hora);
            const fechaLocal = fechaUTC.toLocaleString(); // Obtengo fecha y hora local
            const [fecha, hora] = fechaLocal.split(', '); 

            logs.push({
              id: log.usuario?.id || '',
              nombre: log.usuario?.nombre || 'Desconocido',
              apellido: log.usuario?.apellido || '',
              email: log.usuario?.email || '',
              fecha,
              hora,
            });
          });
        }

        this.logIngresos = logs;
      });
  }

  exportToExcelTurnosPorEspecialidad() {
    if (!this.pieChart || !this.pieChart.chart) {
      console.error('Gráfico no disponible');
      return;
    }

    const chartImageBase64 = this.pieChart.chart.toBase64Image();
    const base64Data = chartImageBase64.replace(/^data:image\/png;base64,/, '');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Turnos por Especialidad');

    worksheet.getCell('A1').value = 'Turnos por Especialidad';
    worksheet.getCell('A1').font = { size: 16, bold: true };

    const imageId = workbook.addImage({
      base64: base64Data,
      extension: 'png',
    });

    worksheet.addImage(imageId, {
    editAs: 'oneCell',
    tl: { col: 0, row: 2 },
    ext: { width: 500, height: 300 }
    });

    const labels = this.pieChartLabels;
    const data = this.pieChartData;
    let startRow = 20;
    worksheet.getCell(`A${startRow - 1}`).value = 'Especialidad'; 
    worksheet.getCell(`B${startRow - 1}`).value = 'Cantidad';

    for (let i = 0; i < labels.length; i++) {
      worksheet.getCell(`A${startRow + i}`).value = labels[i];
      worksheet.getCell(`B${startRow + i}`).value = data[i];
    }

    workbook.xlsx.writeBuffer()
      .then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'turnos_por_especialidad_con_grafico.xlsx');
      })
      .catch(error => {
        console.error('Error generando Excel:', error);
      });
    }

  exportToPDFTurnosPorEspecialidad() {
    const doc = new jsPDF('p', 'mm', 'a4');

    if (!this.pieChart) {
      console.error('Gráfico no disponible');
      return;
    }

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Turnos por Especialidad', 10, 15);

    // Imagen del gráfico
    const chartImage = this.pieChart.chart?.toBase64Image();

    if (!chartImage) return;

    const imgX = 10;
    const imgY = 25;
    const imgWidth = 180;
    const imgHeight = 120;

    doc.addImage(chartImage, 'PNG', imgX, imgY, imgWidth, imgHeight);

    // Datos para las etiquetas
    const labels = this.pieChartLabels;
    const data = this.pieChartData;

    // Total para calcular porcentajes y ángulos
    const total = data.reduce((a, b) => a + b, 0);

    // Ángulo inicial en grados (0 al frente, en jsPDF sube y baja según la imagen)
    let startAngle = 0;

    // Centro y radio del gráfico aproximado dentro de la imagen
    const centerX = imgX + imgWidth / 2;
    const centerY = imgY + imgHeight / 2;
    const radius = Math.min(imgWidth, imgHeight) / 2 * 0.75; 

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (data[i] / total) * 360;
      const midAngle = startAngle + sliceAngle / 2;

      
      const rad = (midAngle - 90) * (Math.PI / 180); 

      // Posición etiqueta (alejarla un poco del centro)
      const labelX = centerX + (radius + 10) * Math.cos(rad);
      const labelY = centerY + (radius + 10) * Math.sin(rad);

      // Texto con especialidad y cantidad
      const text = `${labels[i]}: ${data[i]}`;

      // Agregar texto centrado en esa posición
      const textWidth = doc.getTextWidth(text);
      doc.text(text, labelX - textWidth / 2, labelY);

      startAngle += sliceAngle;
    }

    doc.save('grafico_torta_turnos_especialidad.pdf');
  }


  // Método para exportar PDF turnos por día
  exportToPDFTurnosPorDia() {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    if (!this.pieChartTurnosPorDia || !this.pieChartTurnosPorDia.chart) {
      console.error('Gráfico no disponible');
      return;
    }

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Turnos por Día', 10, 15);

    // Imagen del gráfico
    const chartImage = this.pieChartTurnosPorDia.chart?.toBase64Image();

    if (!chartImage) return;

    const imgX = 10;
    const imgY = 25;
    const imgWidth = 180;
    const imgHeight = 120;

    doc.addImage(chartImage, 'PNG', imgX, imgY, imgWidth, imgHeight);

    // Datos para etiquetas
    const labels = this.pieChartTurnosPorDiaLabels;  // <-- cambio aquí
    const data = this.pieChartTurnosPorDiaData;

    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    const centerX = imgX + imgWidth / 2;
    const centerY = imgY + imgHeight / 2;
    const radius = Math.min(imgWidth, imgHeight) / 2 * 0.75;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (data[i] / total) * 360;
      const midAngle = startAngle + sliceAngle / 2;
      const rad = (midAngle - 90) * (Math.PI / 180);

      const labelX = centerX + (radius + 10) * Math.cos(rad);
      const labelY = centerY + (radius + 10) * Math.sin(rad);

      const text = `${labels[i]}: ${data[i]}`;
      const textWidth = doc.getTextWidth(text);
      doc.text(text, labelX - textWidth / 2, labelY);

      startAngle += sliceAngle;
    }

    doc.save('grafico_torta_turnos_dia.pdf');
  }

  // Método para exportar Excel turnos por día
  exportToExcelTurnosPorDia() {
    if (!this.pieChartTurnosPorDia || !this.pieChartTurnosPorDia.chart) {
      console.error('Gráfico no disponible');
      return;
    }

    const chartImageBase64 = this.pieChartTurnosPorDia.chart.toBase64Image();
    const base64Data = chartImageBase64.replace(/^data:image\/png;base64,/, '');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Turnos por Día');

    worksheet.getCell('A1').value = 'Turnos por Día';
    worksheet.getCell('A1').font = { size: 16, bold: true };

    const imageId = workbook.addImage({
      base64: base64Data,
      extension: 'png',
    });

    worksheet.addImage(imageId, {
      editAs: 'oneCell',
      tl: { col: 0, row: 2 },
      ext: { width: 500, height: 300 }
    });

    workbook.xlsx.writeBuffer()
      .then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'turnos_por_dia_con_grafico.xlsx');
      })
      .catch(error => {
        console.error('Error generando Excel:', error);
      });
  }
  
}
