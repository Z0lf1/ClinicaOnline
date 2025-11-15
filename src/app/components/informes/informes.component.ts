
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.prod';
import { createClient } from '@supabase/supabase-js';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { TurnosComponent } from '../turnos/turnos.component';
import { CommonModule } from '@angular/common';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  ChartOptions,
  ChartData,
  Chart,
  registerables,
  CategoryScale,
  ScatterController,
  PointElement,
  LineElement,
  LinearScale,
  TimeScale
} from 'chart.js';
import { FormsModule } from '@angular/forms';
import 'chartjs-adapter-date-fns';

const supabase = createClient(environment.apiUrl, environment.publicAnonKey);

Chart.register(...registerables);
Chart.register(ScatterController, PointElement, LineElement, LinearScale, TimeScale, CategoryScale);

@Component({
  standalone: true,
  selector: 'app-informes',
  imports: [NgChartsModule, CommonModule, FormsModule],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.scss'
})
export class InformesComponent implements OnInit {

  @ViewChild(BaseChartDirective, { static: false }) pieChart!: BaseChartDirective;
  @ViewChild('pieChartDia', { static: false }) pieChartTurnosPorDia!: BaseChartDirective;
  @ViewChild('pieChartSolicitados', { static: false }) pieChartSolicitados!: BaseChartDirective;
  @ViewChild('pieChartFinalizados', { static: false }) pieChartFinalizados!: BaseChartDirective;
  @ViewChild('pieChartLogs', { static: false }) pieChartLogs!: BaseChartDirective;
  @ViewChild('timelineChart', { static: false }) timelineChart!: BaseChartDirective;
  @ViewChild('barChartTurnosPorMedico', { static: false }) barChartTurnosPorMedico!: BaseChartDirective;

  pieChartSolicitadosLabels: string[] = [];
  pieChartSolicitadosData: number[] = [];

  pieChartFinalizadosLabels: string[] = [];
  pieChartFinalizadosData: number[] = [];
  listaLogsIngresos: { usuario: string; dia: string; hora: string }[] = [];
  fechaDesde: string | null = null;
  fechaHasta: string | null = null;

  logsOriginales: any[] = []; 

  pieChartLogsLabels: string[] = [];
  pieChartLogsData: number[] = [];
  pieChartLogsOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true }
    }
  };

  timelineChartData: ChartData<'scatter'> = { datasets: [] };
  timelineChartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          tooltipFormat: 'dd/MM/yyyy HH:mm',
          displayFormats: {
            hour: 'dd/MM HH:mm',
            day: 'dd/MM/yyyy'
          }
        },
        title: { text: 'Fecha y Hora', display: true },min: new Date('2025-11-10T00:00:00').getTime(), // límite inferior
      // opcional: max puede ser hoy
      max: new Date().getTime()
      },
      y: {
        type: 'category',
        title: { text: 'Usuarios', display: true }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  commonPieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true }
    }
  };
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

barChartMedicosLabels: string[] = [];
barChartMedicosData: ChartData<'bar'> = { labels: [], datasets: [] };
barChartMedicosOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { color: '#333' } },
    title: { display: true, text: 'Turnos por Especialista (Pendientes vs Realizados)', color: '#333', font: { size: 16 } }
  },
  scales: {
    x: { ticks: { color: '#333' },
         grid: { color: '#ccc' }
         },
    y: {type: 'linear',
        beginAtZero: true,
        ticks: { color: '#333' }, 
        grid: { color: '#ccc' } }
  }
};

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.getUserData();
  }

  getUserData() {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Error:', error.message);
        return;
      }
      const userId = data?.user?.id;
      if (!userId) {
        console.error('No se obtuvo userId desde auth');
        return;
      }
      supabase.from('usuariosclinica').select('*').eq('id', userId).single().then(({ data, error }) => {

        if (error) {
          console.error('Error al obtener usuario:', error.message);
          return;
        }
        console.log('Data:', data);
        this.usuario = data;

        this.loadTurnosPorDia();
        this.loadTurnosFinalizadosPorMedico();
        this.loadTurnosPorEspecialidad();
        this.loadTurnosSolicitadosPorMedico();
        this.loadLogIngresos();
        this.loadTurnosComparativoPorMedico();
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
            if (isNaN(fecha.getTime())) return;
            // getDay(): 0=Domingo,1=Lunes,...6=Sábado
            const dayIndex = fecha.getDay(); // 1..6 for Mon..Sat, 0 = Sunday
            // Map dayIndex -> diasValidos index (Lunes=0,...Sábado=5)
            if (dayIndex >= 1 && dayIndex <= 6) {
              const diaSemana = diasValidos[dayIndex - 1];
              conteo[diaSemana]++;
            }
          });
        }

        // Finalmente, asigno los datos a las variables que usás en el gráfico
        this.pieChartTurnosPorDiaLabels = diasValidos;
        this.pieChartTurnosPorDiaData = diasValidos.map(dia => conteo[dia]);

        setTimeout(() => this.pieChartTurnosPorDia?.update(), 0);
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
            const especialidad = turno.especialidad || 'Sin Especificar';
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

        setTimeout(() => this.pieChart?.update(), 0);
      });
  }

  loadTurnosSolicitadosPorMedico() {
    supabase.from('turnos')
      .select('especialista_id, usuariosclinica(nombre, apellido)')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error en turnos solicitados por médico:', error.message);
          return;
        }

        const conteo: { especialista_id: string, nombre: string, apellido: string, count: number }[] = [];

        if (data) {
          data.forEach((turno: any) => {
            const id = turno.especialista_id;
            const nombre = turno.usuariosclinica?.nombre || 'Desconocido';
            const apellido = turno.usuariosclinica?.apellido || '';

            const existente = conteo.find(item => item.especialista_id === id);
            if (existente) {
              existente.count++;
            } else {
              conteo.push({ especialista_id: id, nombre, apellido, count: 1 });
            }
          });
        }

        this.turnosSolicitadosPorMedico = conteo;
        this.pieChartSolicitadosLabels = conteo.map(m => `${m.nombre} ${m.apellido}`);
        this.pieChartSolicitadosData = conteo.map(m => m.count);
        setTimeout(() => this.pieChartSolicitados?.update(), 0);
      });

  }

  loadTurnosFinalizadosPorMedico() {
    supabase.from('turnos')
      .select('especialista_id, estado, usuariosclinica(nombre, apellido)')
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
              const nombre = turno.usuariosclinica?.nombre || 'Desconocido';
              const apellido = turno.usuariosclinica?.apellido || '';

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
        setTimeout(() => this.pieChartFinalizados?.update(), 0);
      });
  }

  // loadLogIngresos() {

  //   supabase
  //     .from('logs-usuarios')
  //     .select(`
  //       fecha_hora,
  //       usuariosclinica ( id, nombre, apellido, email )
  //     `)
  //     .order('fecha_hora', { ascending: true })
  //     .then(({ data, error }) => {

  //       if (error) {
  //         console.error('Error al cargar logs de ingreso:', error.message);
  //         return;
  //       }

  //       console.log("DATA LOGS:", data);

  //       if (!data) return;

  //       this.logsOriginales = data.filter(log =>{if(!log.fecha_hora) return false;
  //         const d =new Date(log.fecha_hora);
  //         return !isNaN (d.getTime()) && d >= new Date ('2025-01-01T00:00:00');
  //       } ); // guardo copia original sin filtrar
  //       // Aplicamos filtro (si hay fechas seleccionadas) y reconstruimos chart y tabla
  //       //this.aplicarFiltro();

  //     });
  // }
loadLogIngresos() {
  supabase
    .from('logs-usuarios')
    .select(`
      fecha_hora,
      usuariosclinica ( id, nombre, apellido, email )
    `)
    .order('fecha_hora', { ascending: true })
    .then(({ data, error }) => {

      if (error) {
        console.error('Error al cargar logs de ingreso:', error.message);
        return;
      }

      if (!data) return;

      const fechaMinima = new Date('2025-01-01T00:00:00');

      // Filtrar logs inválidos o anteriores a 2025
      this.logsOriginales = data.filter(log => {
        if (!log.fecha_hora) return false;
        const d = new Date(log.fecha_hora);
        return !isNaN(d.getTime()) && d >= fechaMinima;
      });

      // Aplicamos filtro para reconstruir gráfico y tabla
      this.aplicarFiltro();
    });
}

  exportToExcelIngresos() {
    const exportData: any[] = [];

    this.timelineChartData.datasets.forEach(dataset => {
      (dataset.data as any[]).forEach((punto: any) => {
        const fecha = new Date(punto.x);

        exportData.push({
          Usuario: punto.y,
          Fecha: fecha.toLocaleDateString('es-AR'),
          Hora: fecha.toLocaleTimeString('es-AR')
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ingresos');

    XLSX.writeFile(workbook, 'Ingresos_Usuarios.xlsx');
  }

  exportToPDFIngresos() {
    const canvas = this.timelineChart?.chart?.canvas;

    if (!canvas) {
      console.error('No se encontró el canvas del timeline');
      return;
    }

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height + 40]
    });

    pdf.text('Ingresos al Sistema', 20, 20);
    pdf.addImage(imgData, 'PNG', 10, 30, canvas.width - 20, canvas.height - 20);

    pdf.save('Ingresos_Usuarios.pdf');
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

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Turnos por Especialidad', 10, 15);

    const chartImage = this.pieChart.chart?.toBase64Image();
    if (!chartImage) return;

    const imgX = 10;
    const imgY = 25;
    const imgWidth = 180;
    const imgHeight = 120;

    doc.addImage(chartImage, 'PNG', imgX, imgY, imgWidth, imgHeight);

    const labels = this.pieChartLabels;
    const data = this.pieChartData;
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

    doc.save('grafico_torta_turnos_especialidad.pdf');
  }

  exportToPDFTurnosPorDia() {
    const doc = new jsPDF('p', 'mm', 'a4');

    if (!this.pieChartTurnosPorDia || !this.pieChartTurnosPorDia.chart) {
      console.error('Gráfico no disponible');
      return;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Turnos por Día', 10, 15);

    const chartImage = this.pieChartTurnosPorDia.chart?.toBase64Image();
    if (!chartImage) return;

    const imgX = 10;
    const imgY = 25;
    const imgWidth = 180;
    const imgHeight = 120;

    doc.addImage(chartImage, 'PNG', imgX, imgY, imgWidth, imgHeight);

    const labels = this.pieChartTurnosPorDiaLabels;
    const data = this.pieChartTurnosPorDiaData;
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    const centerX = imgX + imgWidth / 2;
    const centerY = imgY + imgHeight / 2;
    const radius = Math.min(imgWidth, imgHeight) / 2 * 0.75;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (let i = 0; i < data.length; i++) {
      const sliceAngle = total === 0 ? 0 : (data[i] / total) * 360;
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


// aplicarFiltro() {
//   if (!this.logsOriginales) return;

//   let filtrados = this.logsOriginales.slice(); // copia de seguridad

//   // Normalizar fechas del filtro
//   let desde: Date | null = null;
//   let hasta: Date | null = null;

//   if (this.fechaDesde) {
//     desde = new Date(this.fechaDesde);
//     desde.setHours(0, 0, 0, 0);
//   }

//   if (this.fechaHasta) {
//     hasta = new Date(this.fechaHasta);
//     hasta.setHours(23, 59, 59, 999);
//   }

//   // Filtrado por rango
//   if (desde) {
//     filtrados = filtrados.filter((log: any) => {
//       if (!log?.fecha_hora) return false;
//       const d = new Date(log.fecha_hora);
//       return !isNaN(d.getTime()) && d >= desde!;
//     });
//   }

//   if (hasta) {
//     filtrados = filtrados.filter((log: any) => {
//       if (!log?.fecha_hora) return false;
//       const d = new Date(log.fecha_hora);
//       return !isNaN(d.getTime()) && d <= hasta!;
//     });
//   }

//   // Reconstruir tabla y datos del gráfico
//   const agrupado: Record<string, any[]> = {};
//   this.listaLogsIngresos = [];

//   const fechaMinima = new Date('2025-01-01T00:00:00'); // solo desde 2025

//   filtrados.forEach((log: any) => {
//     const raw = log.fecha_hora;
//     if (!raw) return;

//     const fecha = new Date(raw);
//     if (isNaN(fecha.getTime())) return;

//     if (fecha < fechaMinima) return; // ignorar antes de 2025

//     const usuario = log.usuariosclinica
//       ? `${log.usuariosclinica.nombre || 'Desconocido'} ${log.usuariosclinica.apellido || ''}`.trim()
//       : (log.usuario_nombre || log.usuario || log.usuario_id || 'Desconocido');

//     // this.listaLogsIngresos.push({
//     //   usuario,
//     //   dia: fecha.toLocaleDateString('es-AR'),
//     //   hora: fecha.toLocaleTimeString('es-AR')
//     // });
//     if (!isNaN(fecha.getTime()) && fecha >= fechaMinima) {
//      this.listaLogsIngresos.push({
//     usuario,
//     dia: fecha.toLocaleDateString('es-AR'),
//     hora: fecha.toLocaleTimeString('es-AR')
//   });
// }

//     if (!agrupado[usuario]) agrupado[usuario] = [];
//     agrupado[usuario].push({
//       x: fecha, // objeto Date
//       y: usuario
//     });
//   });

//   // Crear datasets por usuario
//   const datasets = Object.keys(agrupado).map(usuario => ({
//     label: usuario,
//     data: agrupado[usuario],
//     pointRadius: 6,
//     pointHoverRadius: 8,
//     showLine: false,
//     type: 'scatter' as const
//   }));

//   this.timelineChartData = { datasets };

//   // Refrescar chart
//   setTimeout(() => {
//     try {
//       this.timelineChart?.update();
//     } catch (e) {
//       console.warn('No se pudo actualizar timelineChart.', e);
//     }
//   }, 0);
// }
aplicarFiltro() {
  if (!this.logsOriginales) return;

  let filtrados = this.logsOriginales.slice(); // copia local

  // Normalizar fechas del filtro
  let desde: Date | null = this.fechaDesde ? new Date(this.fechaDesde) : null;
  let hasta: Date | null = this.fechaHasta ? new Date(this.fechaHasta) : null;

  if (desde) desde.setHours(0, 0, 0, 0);
  if (hasta) hasta.setHours(23, 59, 59, 999);

  // Filtrar por rango de fechas
  if (desde) {
    filtrados = filtrados.filter(log => new Date(log.fecha_hora) >= desde!);
  }

  if (hasta) {
    filtrados = filtrados.filter(log => new Date(log.fecha_hora) <= hasta!);
  }

  const lista: { usuario: string; dia: string; hora: string }[] = [];
  const agrupado: Record<string, any[]> = {};

  filtrados.forEach(log => {
    const fecha = new Date(log.fecha_hora);
    if (isNaN(fecha.getTime())) return; // ignorar fechas inválidas

    const usuario = log.usuariosclinica
      ? `${log.usuariosclinica.nombre || 'Desconocido'} ${log.usuariosclinica.apellido || ''}`.trim()
      : (log.usuario_nombre || log.usuario || log.usuario_id || 'Desconocido');

    // Llenar tabla
    lista.push({
      usuario,
      dia: fecha.toLocaleDateString('es-AR'),
      hora: fecha.toLocaleTimeString('es-AR')
    });

    // Llenar datasets por usuario
    if (!agrupado[usuario]) agrupado[usuario] = [];
    agrupado[usuario].push({ x: fecha, y: usuario });
  });

  this.listaLogsIngresos = lista;

  // Crear datasets para el gráfico
  this.timelineChartData = {
    datasets: Object.keys(agrupado).map(usuario => ({
      label: usuario,
      data: agrupado[usuario],
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false,
      type: 'scatter' as const
    }))
  };

  // Refrescar chart
  setTimeout(() => {
    try {
      this.timelineChart?.update();
    } catch (e) {
      console.warn('No se pudo actualizar timelineChart.', e);
    }
  }, 0);
}

  filtrarIngresos() {
    this.aplicarFiltro();
  }


  loadTurnosComparativoPorMedico() {
  // Traer turnos junto a la información del especialista
  supabase.from('turnos')
    .select('especialista_id, estado, usuariosclinica(nombre, apellido)')
    .then(({ data, error }) => {
      if (error) {
        console.error('Error cargando turnos para gráfico comparativo:', error.message);
        return;
      }
      if (!data) return;

      // Mapear especialista -> contador de pendientes y realizados
      const mapMedicos = new Map<string, { pendiente: number, realizado: number }>();

      data.forEach((turno: any) => {
        const nombre = turno.usuariosclinica?.nombre || 'Desconocido';
        const apellido = turno.usuariosclinica?.apellido || '';
        const fullName = `${nombre} ${apellido}`.trim();

        if (!mapMedicos.has(fullName)) {
          mapMedicos.set(fullName, { pendiente: 0, realizado: 0 });
        }
        const contador = mapMedicos.get(fullName)!;

        if (turno.estado === 'pendiente') contador.pendiente++;
        if (turno.estado === 'realizado') contador.realizado++;
      });

      // Convertir a arrays para el gráfico
      this.barChartMedicosLabels = Array.from(mapMedicos.keys());
      const pendientes = Array.from(mapMedicos.values()).map(v => v.pendiente);
      const realizados = Array.from(mapMedicos.values()).map(v => v.realizado);
      console.log("MEDICOS", this.barChartMedicosData);
      this.barChartMedicosData = {
        labels: this.barChartMedicosLabels,
        datasets: [
          { label: 'Pendientes', data: pendientes, backgroundColor: '#FFA726' },
          { label: 'Realizados', data: realizados, backgroundColor: '#66BB6A' }
        ]
      };

      // Refrescar chart
      setTimeout(() => this.barChartTurnosPorMedico?.update(), 0);
    });
}

}
